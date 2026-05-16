/**
 * POST /api/admin/migrate
 * Migration en masse de tous les tenants d'un plan vers un autre.
 * Réservé au superadmin.
 *
 * Body: { fromPlan: "starter", toPlan: "premium" }
 * Réponse: { migratedCount, skippedCount, tenants: [{ id, name, oldPlan, newPlan }] }
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_TOKENS, PLAN_MAX_DAYS } from "@/lib/billing";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { fromPlan, toPlan } = await req.json();

  if (!fromPlan || !toPlan) {
    return new Response("fromPlan et toPlan sont requis", { status: 400 });
  }
  if (fromPlan === toPlan) {
    return new Response("fromPlan et toPlan doivent être différents", { status: 400 });
  }

  // Trouver tous les tenants avec l'ancien plan
  const tenants = await prisma.tenant.findMany({
    where: { plan: fromPlan },
    select: { id: true, name: true, plan: true },
  });

  if (tenants.length === 0) {
    return Response.json({
      migratedCount: 0,
      skippedCount: 0,
      tenants: [],
      message: `Aucun tenant avec le plan "${fromPlan}" trouvé.`,
    });
  }

  const baseTokens = PLAN_TOKENS[toPlan] ?? 500_000;
  const now = new Date();
  const maxDays = PLAN_MAX_DAYS[toPlan] ?? null;
  const trialEndsAt = toPlan === "trial" && maxDays
    ? new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)
    : null;

  // Migration en masse avec updateMany
  const result = await prisma.tenant.updateMany({
    where: { plan: fromPlan },
    data: {
      plan: toPlan,
      monthlyTokenLimit: baseTokens,
      planStartedAt: now,
      trialEndsAt,
    },
  });

  // Audit log pour chaque tenant migré
  for (const t of tenants) {
    await audit(req, session, "tenant.plan_change",
      { type: "Tenant", id: t.id },
      { from: fromPlan, to: toPlan, reason: "bulk_migration" });
  }

  return Response.json({
    migratedCount: result.count,
    skippedCount: tenants.length - result.count,
    fromPlan,
    toPlan,
    newTokenLimit: baseTokens,
    tenants: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      oldPlan: fromPlan,
      newPlan: toPlan,
    })),
  });
}
