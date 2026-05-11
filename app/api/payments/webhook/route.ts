import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { getProviderByName } from "@/lib/payments/router";
import { cinetPayProvider } from "@/lib/payments/providers/cinetpay";
import { WebhookSignatureError } from "@/lib/payments/types";
import { tokensForTopup } from "@/lib/billing";
import { audit } from "@/lib/audit";
import { log } from "@/lib/logger";

export async function POST(req: Request) {
  // Determine which provider sent this webhook via ?provider= query param.
  // Defaults to cinetpay for backwards-compatibility.
  const url = new URL(req.url);
  const providerName = url.searchParams.get("provider") ?? "cinetpay";

  const provider = getProviderByName(providerName) ?? cinetPayProvider;

  // Clone req so we can read it twice if needed
  const reqClone = req.clone();

  let webhookResult: import("@/lib/payments/types").WebhookResult;
  try {
    webhookResult = await provider.parseWebhook(reqClone);
  } catch (e) {
    const isSiteMismatch =
      e instanceof WebhookSignatureError &&
      String(e.message).includes("site_id");
    const action = isSiteMismatch
      ? "payment.webhook.site_mismatch"
      : "payment.webhook.signature_invalid";

    log("warn", `webhook: ${action}`, {
      provider: providerName,
      error: String(e),
      ip: req.headers.get("x-forwarded-for"),
    });

    await audit(null, null, action as import("@/lib/audit").AuditAction, undefined, {
      provider: providerName,
      error: String(e),
      ip: req.headers.get("x-forwarded-for"),
    });

    return new Response("Bad Request", { status: 400 });
  }

  const { transactionId } = webhookResult;

  await audit(null, null, "payment.webhook.received", undefined, {
    transactionId,
    provider: providerName,
  });

  // Load payment
  const payment = await prisma.payment.findUnique({ where: { transactionId } });
  if (!payment) {
    log("warn", "webhook: transaction not found", { transactionId, provider: providerName });
    return new Response("Not Found", { status: 404 });
  }

  // Idempotence: already processed
  if (payment.status === "PAID") {
    log("info", "webhook: already PAID, skipping", { transactionId });
    await audit(
      null,
      null,
      "payment.duplicate_webhook_blocked",
      { type: "Payment", id: payment.id },
      { transactionId }
    );
    return new Response("OK", { status: 200 });
  }

  // Re-verify with provider (NEVER trust webhook payload alone)
  const verified = await provider.verify(transactionId);
  log("info", "webhook: verified status", {
    transactionId,
    provider: providerName,
    status: verified.status,
    operator: verified.operator,
  });

  if (verified.status === "PAID") {
    // Calculate tokens for topup
    let tokensAdded = 0;
    if (payment.type === "topup") {
      tokensAdded = tokensForTopup(payment.amountFcfa);
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          paidAt: verified.paidAt ?? new Date(),
          operator: verified.operator,
          tokensAdded,
          rawProviderPayload: verified.rawPayload as Prisma.InputJsonValue,
        },
      });

      if (payment.type === "topup" && tokensAdded > 0) {
        await tx.tenant.update({
          where: { id: payment.tenantId },
          data: { monthlyTokenLimit: { increment: tokensAdded } },
        });
      }
    });

    await audit(
      null,
      null,
      "payment.completed",
      { type: "Payment", id: payment.id },
      {
        transactionId,
        provider: providerName,
        amount: payment.amountFcfa,
        operator: verified.operator,
        paidAt: verified.paidAt,
      }
    );

    if (payment.type === "topup" && tokensAdded > 0) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: payment.tenantId },
        select: { monthlyTokenLimit: true },
      });
      await audit(
        null,
        null,
        "payment.topup.credited",
        { type: "Payment", id: payment.id },
        {
          transactionId,
          tokensAdded,
          newLimit: tenant?.monthlyTokenLimit,
        }
      );
    }
  } else if (verified.status === "FAILED" || verified.status === "CANCELLED") {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: verified.status,
        failureReason: verified.failureReason,
        rawProviderPayload: verified.rawPayload as Prisma.InputJsonValue,
      },
    });

    await audit(
      null,
      null,
      "payment.failed",
      { type: "Payment", id: payment.id },
      {
        transactionId,
        provider: providerName,
        failureReason: verified.failureReason,
      }
    );
  }
  // PENDING: do nothing, provider will retry

  return new Response("OK", { status: 200 });
}
