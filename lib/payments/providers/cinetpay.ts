/**
 * CinetPay payment provider driver.
 * Docs: https://docs.cinetpay.com/api/1.0-fr/checkout/initialisation
 *
 * Flow: initiate → redirect to CinetPay → webhook → verify → update DB
 * Always re-verify via /payment/check — never trust webhook payload alone.
 */
import type { PaymentProvider, InitiateParams, InitiateResult, PaymentStatus, WebhookResult } from "../types";
import { PaymentError, WebhookSignatureError } from "../types";
import { log } from "@/lib/logger";

function getEnv() {
  const apiKey = process.env.CINETPAY_API_KEY;
  const siteId = process.env.CINETPAY_SITE_ID;
  const apiPassword = process.env.CINETPAY_API_PASSWORD;
  const baseUrl = process.env.CINETPAY_BASE_URL ?? "https://api-checkout.cinetpay.com/v2";
  if (!apiKey) throw new PaymentError("MISSING_CONFIG", "CINETPAY_API_KEY manquante");
  if (!siteId) throw new PaymentError("MISSING_CONFIG", "CINETPAY_SITE_ID manquante");
  return { apiKey, siteId, apiPassword, baseUrl };
}

/** Map CinetPay status codes to our unified status */
function mapStatus(code: string, message?: string): PaymentStatus["status"] {
  if (code === "00" || code === "ACCEPTED") return "PAID";
  if (code === "662" || code === "WAITING_FOR_CUSTOMER" || code === "CREATED") return "PENDING";
  if (code === "CANCELLED" || code === "63") return "CANCELLED";
  if (code === "REFUSED" || code === "FAILED" || code === "PAYMENT_FAILED") return "FAILED";
  log("warn", "cinetpay.mapStatus: unknown code", { code, message });
  return "FAILED";
}

export const cinetPayProvider: PaymentProvider = {
  name: "cinetpay",

  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const { apiKey, siteId, baseUrl } = getEnv();

    // Split customerName into first/last (CinetPay requires both)
    const nameParts = params.customerName.trim().split(" ");
    const customerSurname = nameParts.slice(1).join(" ") || nameParts[0];
    const customerName = nameParts[0];

    const body = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: params.transactionId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      customer_name: customerName,
      customer_surname: customerSurname,
      customer_email: params.customerEmail,
      customer_phone_number: params.customerPhone,
      customer_address: "",
      customer_city: "",
      customer_country: "CI",
      customer_state: "CI",
      customer_zip_code: "00225",
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      channels: params.channel,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
      lang: "FR",
      invoice_data: {},
    };

    log("info", "cinetpay.initiate: request", {
      transactionId: params.transactionId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      notifyUrl: params.notifyUrl,
    });

    const res = await fetch(`${baseUrl}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json() as {
      code: string;
      message: string;
      description?: string;
      data?: { payment_url?: string; payment_token?: string };
    };

    log("info", "cinetpay.initiate: response", {
      transactionId: params.transactionId,
      code: data.code,
      message: data.message,
    });

    if (data.code !== "201") {
      throw new PaymentError(
        `CINETPAY_${data.code}`,
        data.description ?? data.message ?? "Erreur CinetPay lors de l'initialisation du paiement"
      );
    }

    if (!data.data?.payment_url) {
      throw new PaymentError("CINETPAY_NO_URL", "CinetPay n'a pas retourné d'URL de paiement");
    }

    return {
      paymentUrl: data.data.payment_url,
      transactionId: params.transactionId,
      providerRef: data.data.payment_token,
    };
  },

  async verify(transactionId: string): Promise<PaymentStatus> {
    const { apiKey, siteId, baseUrl } = getEnv();

    log("info", "cinetpay.verify: request", { transactionId });

    const res = await fetch(`${baseUrl}/payment/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
    });

    const raw = await res.json() as {
      code: string;
      message?: string;
      data?: {
        status?: string;
        payment_method?: string;
        paid_at?: string;
        payment_date?: string;
      };
    };

    log("info", "cinetpay.verify: response", {
      transactionId,
      code: raw.code,
      status: raw.data?.status,
    });

    const statusCode = raw.data?.status ?? raw.code ?? "UNKNOWN";
    const status = mapStatus(statusCode, raw.message);
    const paidAtStr = raw.data?.paid_at ?? raw.data?.payment_date;

    return {
      status,
      operator: raw.data?.payment_method,
      paidAt: paidAtStr ? new Date(paidAtStr) : status === "PAID" ? new Date() : undefined,
      failureReason: status === "FAILED" || status === "CANCELLED" ? (raw.message ?? statusCode) : undefined,
      rawPayload: raw,
    };
  },

  async parseWebhook(req: Request): Promise<WebhookResult> {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      throw new WebhookSignatureError("Corps webhook illisible (attendu: application/x-www-form-urlencoded)");
    }

    const cpmTransId = formData.get("cpm_trans_id") as string | null;
    const cpmSiteId = formData.get("cpm_site_id") as string | null;

    // Security check 1: site_id must match ours
    const { siteId } = getEnv();
    if (!cpmSiteId || cpmSiteId !== siteId) {
      log("warn", "cinetpay.parseWebhook: site_id mismatch", {
        received: cpmSiteId,
        expected: siteId,
      });
      throw new WebhookSignatureError(`site_id reçu (${cpmSiteId}) ne correspond pas à notre site_id`);
    }

    if (!cpmTransId) {
      throw new WebhookSignatureError("cpm_trans_id manquant dans le webhook");
    }

    // Note: CinetPay does not consistently provide an HMAC signature in the
    // standard checkout flow (the signature field "signature" is present in some
    // webhook versions). We rely on:
    //   1. site_id validation (above)
    //   2. Always re-verifying via /payment/check (never trust the payload)
    // If CinetPay adds HMAC in the future:
    //   const sig = formData.get("signature") as string;
    //   const expected = createHmac("sha256", CINETPAY_API_PASSWORD).update(cpmTransId).digest("hex");
    //   if (sig !== expected) throw new WebhookSignatureError("HMAC invalide");

    log("info", "cinetpay.parseWebhook: received", { transactionId: cpmTransId, siteId: cpmSiteId });

    return {
      transactionId: cpmTransId,
      status: "PENDING", // real status obtained via verify()
      verified: true,
    };
  },
};
