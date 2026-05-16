import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tokensForTopup, tokensForSurplus, PLAN_TOKENS, PLAN_MAX_DAYS, currentPeriod } from "@/lib/billing";
import { audit } from "@/lib/audit";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "";
  if (!session || (role !== "admin" && role !== "superadmin")) {
    return new Response("Forbidden", { status: 403 });
  }

  // SECURITY FIX (May 2026, ST-012): superadmin sees all, admin sees own tenant only.
  // Previously this returned every payment across every tenant.
  const tenantFilter = role === "superadmin" ? undefined : { tenantId: session.user.tenantId };

  const payments = await prisma.payment.findMany({
    where: tenantFilter,
    include: { tenant: { select: { name: true } } },
    orderBy: { paidAt: "desc" },
    take: 100,
  });

  return Response.json(payments);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return new Response("Forbidden — seul le superadmin peut enregistrer des paiements", {
      status: 403,
    });
  }

  const {
    tenantId,
    amountFcfa,
    type = "subscription",
    method = "cash",
    reference,
    period,
    notes,
    // Optional: activate a new plan at the same time as recording payment.
    // { plan: "premium", planPriceFcfa: 20000 }
    planActivation,
  } = await req.json();

  if (!tenantId || !amountFcfa || !period) {
    return new Response("tenantId, amountFcfa et period sont requis", { status: 400 });
  }

  const parsedAmount = Number(amountFcfa);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return new Response("amountFcfa doit être un nombre positif", { status: 400 });
  }

  // Vérifier que l'entreprise existe
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    return new Response("Entreprise introuvable", { status: 404 });
  }

  let tokensAdded = 0;
  let planChanged = false;
  let newPlanKey = "";

  // ── Cas 1 : Recharge de tokens ─────────────────────────────────────
  if (type === "topup") {
    tokensAdded = tokensForTopup(parsedAmount);
    if (tokensAdded > 0) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { monthlyTokenLimit: { increment: tokensAdded } },
      });
    }
  }

  // ── Cas 2 : Abonnement avec activation d'une nouvelle offre ────────
  // planActivation = { plan: "premium", planPriceFcfa: 20000 }
  // Si le montant payé > prix du plan → tokens bonus au prorata du surplus
  if (type === "subscription" && planActivation?.plan) {
    const { plan, planPriceFcfa } = planActivation as { plan: string; planPriceFcfa: number };
    const planPrice = Number(planPriceFcfa) || 0;
    const surplus = Math.max(0, parsedAmount - planPrice);
    const bonusTokens = tokensForSurplus(surplus);
    const baseTokens = PLAN_TOKENS[plan] ?? 500_000;
    tokensAdded = bonusTokens; // only bonus tracked on payment; base comes from plan
    newPlanKey = plan;
    planChanged = true;

    // Compute plan lifecycle timestamps
    const now = new Date();
    const maxDays = PLAN_MAX_DAYS[plan] ?? null;
    const trialEndsAt = plan === "trial" && maxDays
      ? new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)
      : null;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plan,
        monthlyTokenLimit: baseTokens + bonusTokens,
        active: true,
        planStartedAt: now,
        trialEndsAt,
      },
    });

    await audit(req, session, "tenant.plan_change",
      { type: "Tenant", id: tenantId },
      { from: tenant.plan, to: plan, amountFcfa: parsedAmount, surplus, bonusTokens });
  }

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      amountFcfa: parsedAmount,
      type,
      tokensAdded,
      method: method ?? "cash",
      reference: reference ?? null,
      period: period ?? currentPeriod(),
      notes: notes ?? null,
      createdById: session.user.id,
      // Legacy fields
      amount: parsedAmount,
      currency: "XOF",
    },
    include: { tenant: { select: { name: true } } },
  });

  await audit(req, session, "payment.create",
    { type: "Payment", id: payment.id },
    {
      tenantId, tenantName: tenant.name, type, amountFcfa: parsedAmount,
      method, reference: reference ?? null, period, tokensAdded,
      planChanged, newPlan: newPlanKey || null,
    });

  return Response.json({ ...payment, planChanged, newPlan: newPlanKey || null }, { status: 201 });
}
