import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/payments/router";
import { audit } from "@/lib/audit";
import { log } from "@/lib/logger";
import { PaymentError, PaymentsDisabledError } from "@/lib/payments/types";
import { currentPeriod } from "@/lib/billing";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  // Per-user rate limit: 5 initiations per 5 minutes
  const userLimit = checkRateLimit(`payment-init:user:${session.user.id}`, 5, 5 * 60 * 1000);
  if (!userLimit.ok) {
    return new Response(
      JSON.stringify({ error: "Trop de tentatives. Attendez quelques minutes avant de réessayer." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { type?: string; amount?: number; period?: string; channel?: string; plan?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Corps JSON invalide", { status: 400 });
  }

  const { type = "subscription", amount, period, channel = "ALL", plan } = body;

  // Validation
  if (type !== "subscription" && type !== "topup") {
    return new Response("type doit être 'subscription' ou 'topup'", { status: 400 });
  }
  if (!amount || !Number.isInteger(amount) || amount < 100) {
    return new Response("amount doit être un entier ≥ 100 (FCFA)", { status: 400 });
  }
  if (type === "subscription" && (!period || !/^\d{4}-\d{2}$/.test(period))) {
    return new Response("period au format AAAA-MM requis pour un abonnement", { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
  if (!tenant) return new Response("Entreprise introuvable", { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return new Response("Utilisateur introuvable", { status: 404 });

  // Generate unique transaction ID
  const transactionId = `ARIA-${tenant.id.slice(-6)}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

  let provider;
  try {
    provider = getProvider(tenant);
  } catch (e) {
    if (e instanceof PaymentsDisabledError) {
      return new Response(JSON.stringify({ error: e.message }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
    throw e;
  }

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://assistai-six.vercel.app";
  // notifyUrl embeds provider name so the webhook route knows how to dispatch
  const notifyUrl = `${baseUrl}/api/payments/webhook?provider=${provider.name}`;
  const returnUrl = `${baseUrl}/billing?tx=${transactionId}`;

  // Create Payment record in PENDING state
  const payment = await prisma.payment.create({
    data: {
      tenantId: tenant.id,
      amountFcfa: amount,
      amount,
      currency: "XOF",
      type,
      tokensAdded: 0,
      method: provider.name,
      period: period ?? currentPeriod(),
      providerName: provider.name,
      transactionId,
      status: "PENDING",
      initiatedAt: new Date(),
      createdById: session.user.id,
      notes: plan ? JSON.stringify({ targetPlan: plan }) : null,
    },
  });

  log("info", "payment.initiate: created", {
    transactionId,
    tenantId: tenant.id,
    userId: session.user.id,
    provider: provider.name,
    amount,
    type,
  });

  try {
    const result = await provider.initiate({
      transactionId,
      tenantId: tenant.id,
      userId: session.user.id,
      amount,
      currency: "XOF",
      description: type === "topup"
        ? `Recharge tokens LIYA — ${amount.toLocaleString("fr-FR")} FCFA`
        : `Abonnement LIYA ${period ?? currentPeriod()}`,
      type: type as "subscription" | "topup",
      period,
      customerName: user.name ?? user.email,
      customerEmail: user.email,
      customerPhone: "+22300000000", // placeholder — user profile doesn't have phone yet
      notifyUrl,
      returnUrl,
      channel: (channel ?? "ALL") as import("@/lib/payments/types").PaymentChannel,
      metadata: { tenantId: tenant.id, userId: session.user.id, paymentId: payment.id },
    });

    // Update payment with provider ref
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerRef: result.providerRef },
    });

    await audit(req, session, "payment.initiated",
      { type: "Payment", id: payment.id },
      { transactionId, amount, type, provider: provider.name, period }
    );

    log("info", "payment.initiate: success", { transactionId, paymentUrl: result.paymentUrl });

    return Response.json({ paymentUrl: result.paymentUrl, transactionId });
  } catch (e) {
    const msg = e instanceof PaymentError ? e.message : "Erreur lors de l'initialisation du paiement";
    log("error", "payment.initiate: provider error", { transactionId, error: String(e) });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: msg },
    });

    return new Response(
      JSON.stringify({ error: "Le paiement n'a pas pu être initialisé. Réessayez ou contactez le support." }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
