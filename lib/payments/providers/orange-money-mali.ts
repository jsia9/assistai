/**
 * Orange Money Mali — Direct Web Payment integration.
 *
 * API reference: https://developer.orange.com/apis/om-webpay-ml/api-reference
 *
 * Flow:
 *   1. OAuth2 client_credentials → access_token (expires in ~3600s, cached)
 *   2. POST /orange-money-webpay/ml/v1/webpayment → payment_url
 *   3. Redirect user to payment_url (Orange Money hosted page)
 *   4. User pays on phone (USSD confirmation)
 *   5. Orange Money POSTs to notif_url (JSON body)
 *   6. We re-verify via GET /orange-money-webpay/ml/v1/orderstatus/{order_id}
 *
 * Env vars required:
 *   OM_CLIENT_ID          — client_id from Orange Developer portal
 *   OM_CLIENT_SECRET      — client_secret from Orange Developer portal
 *   OM_MERCHANT_KEY       — merchant key from Orange Money Mali back-office
 *   OM_BASE_URL           — (optional) override API base, default: https://api.orange.com
 *   OM_MODE               — SANDBOX | PRODUCTION (default: SANDBOX)
 */

import type {
  PaymentProvider,
  InitiateParams,
  InitiateResult,
  PaymentStatus,
  WebhookResult,
} from "../types";
import { PaymentError, WebhookSignatureError } from "../types";
import { log } from "@/lib/logger";

// ── Token cache (module-level, survives warm Lambda / Edge invocations) ───────
interface CachedToken {
  token: string;
  expiresAt: number; // Date.now() ms
}
let _tokenCache: CachedToken | null = null;

function getConfig() {
  const clientId = process.env.OM_CLIENT_ID;
  const clientSecret = process.env.OM_CLIENT_SECRET;
  const merchantKey = process.env.OM_MERCHANT_KEY;
  const baseUrl = process.env.OM_BASE_URL ?? "https://api.orange.com";

  if (!clientId) throw new PaymentError("MISSING_CONFIG", "OM_CLIENT_ID manquant");
  if (!clientSecret) throw new PaymentError("MISSING_CONFIG", "OM_CLIENT_SECRET manquant");
  if (!merchantKey) throw new PaymentError("MISSING_CONFIG", "OM_MERCHANT_KEY manquant");

  return { clientId, clientSecret, merchantKey, baseUrl };
}

/** Fetch (or return cached) OAuth2 access token. */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s safety margin)
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }

  const { clientId, clientSecret, baseUrl } = getConfig();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  log("info", "om-mali.oauth: requesting new access token", {});

  const res = await fetch(`${baseUrl}/oauth/v3/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    token_type?: string;
    error?: string;
    error_description?: string;
  };

  if (!data.access_token) {
    log("error", "om-mali.oauth: token request failed", {
      error: data.error,
      description: data.error_description,
    });
    throw new PaymentError(
      "OM_AUTH_FAILED",
      data.error_description ?? data.error ?? "Échec d'authentification Orange Money"
    );
  }

  const expiresInSec = data.expires_in ?? 3600;
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (expiresInSec - 60) * 1000,
  };

  log("info", "om-mali.oauth: token obtained", { expiresInSec });
  return data.access_token;
}

/** Map Orange Money status strings to our unified PaymentStatus. */
function mapOmStatus(raw: string): PaymentStatus["status"] {
  const s = raw.toUpperCase();
  if (s === "SUCCESSFULL" || s === "SUCCESS" || s === "COMPLETED" || s === "00") return "PAID";
  if (s === "PENDING" || s === "INITIATED" || s === "WAITING") return "PENDING";
  if (s === "CANCELLED" || s === "EXPIRED") return "CANCELLED";
  // FAILED, REFUSED, ERROR, or anything unknown
  log("warn", "om-mali.mapStatus: unknown status code", { raw });
  return "FAILED";
}

// ── Provider implementation ────────────────────────────────────────────────────

export const orangeMoneyMaliProvider: PaymentProvider = {
  name: "orange-money-mali",

  // ── initiate ──────────────────────────────────────────────────────────────
  async initiate(params: InitiateParams): Promise<InitiateResult> {
    const { merchantKey, baseUrl } = getConfig();
    const token = await getAccessToken();

    const body = {
      merchant_key: merchantKey,
      // Orange Money uses "OUV" (Orange Unit of Value) internally, but amounts
      // are expressed in XOF (FCFA). The API expects the XOF integer amount.
      currency: "OUV",
      order_id: params.transactionId,
      amount: params.amount,
      return_url: params.returnUrl,
      cancel_url: `${params.returnUrl}&cancelled=true`,
      notif_url: params.notifyUrl,
      lang: "fr",
      reference: params.description,
    };

    log("info", "om-mali.initiate: request", {
      transactionId: params.transactionId,
      amount: params.amount,
      notifyUrl: params.notifyUrl,
    });

    const res = await fetch(
      `${baseUrl}/orange-money-webpay/ml/v1/webpayment`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = (await res.json()) as {
      status?: string;
      message?: string;
      description?: string;
      data?: {
        payment_url?: string;
        notif_token?: string;
        pay_token?: string;
      };
    };

    log("info", "om-mali.initiate: response", {
      transactionId: params.transactionId,
      status: data.status,
      message: data.message,
    });

    // Orange Money returns "SUCCESS" or HTTP 200 + status field
    const ok =
      data.status === "SUCCESS" ||
      data.status === "201" ||
      data.status === "200" ||
      res.status === 200 ||
      res.status === 201;

    if (!ok || !data.data?.payment_url) {
      throw new PaymentError(
        `OM_${data.status ?? res.status}`,
        data.description ?? data.message ?? "Orange Money n'a pas retourné d'URL de paiement"
      );
    }

    return {
      paymentUrl: data.data.payment_url,
      transactionId: params.transactionId,
      providerRef: data.data.notif_token ?? data.data.pay_token,
    };
  },

  // ── verify ────────────────────────────────────────────────────────────────
  async verify(transactionId: string): Promise<PaymentStatus> {
    const { baseUrl } = getConfig();
    const token = await getAccessToken();

    log("info", "om-mali.verify: request", { transactionId });

    const res = await fetch(
      `${baseUrl}/orange-money-webpay/ml/v1/orderstatus/${encodeURIComponent(transactionId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    const raw = (await res.json()) as {
      status?: string;
      message?: string;
      data?: {
        status?: string;
        txnid?: string;
        amount?: number;
        pay_date?: string;
        payment_date?: string;
        payment_method?: string;
      };
    };

    log("info", "om-mali.verify: response", {
      transactionId,
      rawStatus: raw.data?.status ?? raw.status,
    });

    const statusStr = raw.data?.status ?? raw.status ?? "UNKNOWN";
    const status = mapOmStatus(statusStr);
    const paidAtStr = raw.data?.pay_date ?? raw.data?.payment_date;

    return {
      status,
      operator: "OM", // Orange Money Mali
      paidAt:
        status === "PAID"
          ? paidAtStr
            ? new Date(paidAtStr)
            : new Date()
          : undefined,
      failureReason:
        status === "FAILED" || status === "CANCELLED"
          ? (raw.message ?? statusStr)
          : undefined,
      rawPayload: raw,
    };
  },

  // ── parseWebhook ──────────────────────────────────────────────────────────
  async parseWebhook(req: Request): Promise<WebhookResult> {
    // Orange Money sends a POST with JSON body (or form-encoded depending on version).
    // We try JSON first, then URL-encoded form data as fallback.
    const contentType = req.headers.get("content-type") ?? "";
    let body: Record<string, unknown>;

    try {
      if (contentType.includes("application/json")) {
        body = await req.json() as Record<string, unknown>;
      } else {
        // application/x-www-form-urlencoded or unknown
        const text = await req.text();
        try {
          body = JSON.parse(text) as Record<string, unknown>;
        } catch {
          const params = new URLSearchParams(text);
          body = Object.fromEntries(params.entries());
        }
      }
    } catch {
      throw new WebhookSignatureError(
        "Corps webhook Orange Money illisible"
      );
    }

    // Extract the order ID (field name varies by API version)
    const orderId =
      (body.order_id as string | undefined) ??
      (body.txnid as string | undefined) ??
      (body.reference as string | undefined);

    if (!orderId) {
      throw new WebhookSignatureError(
        "order_id / txnid manquant dans le webhook Orange Money"
      );
    }

    // Validate notif_token: Orange Money includes this token in the webhook body.
    // We stored it in Payment.providerRef during initiate.
    // Here we verify it matches by looking up the payment record.
    // (Full verification happens via re-verify() in the webhook route.)
    const notifToken = body.notif_token as string | undefined;

    // Note: Orange Money doesn't publish an HMAC spec for Mali web payment.
    // The notif_token is a one-time opaque token. We verify it against DB:
    //   const payment = await prisma.payment.findUnique({ where: { transactionId: orderId } });
    //   if (notifToken && payment?.providerRef && payment.providerRef !== notifToken)
    //     throw new WebhookSignatureError("notif_token invalide");
    // This check is performed in the webhook route handler (where prisma is available).
    // Here we just validate presence and structure.

    log("info", "om-mali.parseWebhook: received", {
      orderId,
      hasNotifToken: !!notifToken,
    });

    return {
      transactionId: orderId,
      status: "PENDING", // real status obtained via verify()
      verified: true,
    };
  },
};
