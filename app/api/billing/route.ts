/**
 * GET /api/billing
 * Retourne les informations de facturation pour l'entreprise de l'utilisateur connecté.
 * Accessible à tous les utilisateurs authentifiés.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PLAN_PRICE_FCFA,
  PLAN_TOKENS,
  TOPUP_FCFA,
  TOPUP_TOKENS,
  fcfaToUsd,
  currentPeriod,
} from "@/lib/billing";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const period = currentPeriod();

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    include: {
      payments: {
        orderBy: { paidAt: "desc" },
        take: 24, // 2 ans d'historique
        select: {
          id: true,
          amountFcfa: true,
          amount: true,
          type: true,
          tokensAdded: true,
          method: true,
          reference: true,
          period: true,
          notes: true,
          paidAt: true,
        },
      },
    },
  });

  if (!tenant) return new Response("Entreprise introuvable", { status: 404 });

  const planPriceFcfa = PLAN_PRICE_FCFA[tenant.plan] ?? 25_000;
  const planPriceUsd = fcfaToUsd(planPriceFcfa);

  // Paiements du mois en cours
  const thisMonthPayments = tenant.payments.filter((p) => p.period === period);
  const subscriptionThisMonth = thisMonthPayments
    .filter((p) => p.type === "subscription")
    .reduce((s, p) => s + (p.amountFcfa > 0 ? p.amountFcfa : Math.round(p.amount * 600)), 0);
  const topupThisMonth = thisMonthPayments
    .filter((p) => p.type === "topup")
    .reduce((s, p) => s + (p.amountFcfa > 0 ? p.amountFcfa : Math.round(p.amount * 600)), 0);
  const tokensAddedThisMonth = thisMonthPayments
    .filter((p) => p.type === "topup")
    .reduce((s, p) => s + p.tokensAdded, 0);

  const isPaidThisMonth = subscriptionThisMonth >= planPriceFcfa;
  const balanceFcfa = Math.max(0, planPriceFcfa - subscriptionThisMonth);

  return Response.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      monthlyTokenLimit: tenant.monthlyTokenLimit,
      active: tenant.active,
    },
    billing: {
      plan: tenant.plan,
      trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
      period,
      planPriceFcfa,
      planPriceUsd,
      planBaseTokens: PLAN_TOKENS[tenant.plan] ?? 500_000,
      subscriptionThisMonth,
      subscriptionThisMonthUsd: fcfaToUsd(subscriptionThisMonth),
      topupThisMonth,
      tokensAddedThisMonth,
      isPaidThisMonth,
      balanceFcfa,
      balanceUsd: fcfaToUsd(balanceFcfa),
      // Info recharge
      topupFcfa: TOPUP_FCFA,
      topupTokens: TOPUP_TOKENS,
      topupUsd: fcfaToUsd(TOPUP_FCFA),
    },
    payments: tenant.payments.map((p) => ({
      ...p,
      amountFcfa: p.amountFcfa > 0 ? p.amountFcfa : Math.round(p.amount * 600),
      amountUsd: fcfaToUsd(p.amountFcfa > 0 ? p.amountFcfa : Math.round(p.amount * 600)),
    })),
  });
}
