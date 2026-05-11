import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { PLAN_MAX_DAYS } from "@/lib/billing";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  // Only superadmin can mutate tenant-level settings
  if (!session || session.user.role !== "superadmin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  // Snapshot the old values so the audit log captures the before/after diff.
  const before = await prisma.tenant.findUnique({
    where: { id },
    select: { monthlyTokenLimit: true, plan: true, active: true },
  });
  if (!before) return new Response("Tenant not found", { status: 404 });

  // When the plan changes, stamp planStartedAt and (for trial) trialEndsAt.
  // This is the single authoritative place where plan lifecycle clocks start.
  const planLifecycle: Record<string, Date | null> = {};
  if (body.plan !== undefined && body.plan !== before.plan) {
    const now = new Date();
    planLifecycle.planStartedAt = now;
    if (body.plan === "trial") {
      const maxDays = PLAN_MAX_DAYS["trial"] ?? 3;
      planLifecycle.trialEndsAt = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    } else {
      // Clear old trial expiry when upgrading off trial
      planLifecycle.trialEndsAt = null;
    }
  }

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      ...(body.monthlyTokenLimit !== undefined && {
        monthlyTokenLimit: Number(body.monthlyTokenLimit),
      }),
      ...(body.plan !== undefined && { plan: body.plan }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt }),
      ...planLifecycle,
    },
  });

  // Log a granular event per field changed so anomaly detection can fire on
  // patterns like "5 quota changes in 10 minutes".
  if (body.monthlyTokenLimit !== undefined && before.monthlyTokenLimit !== updated.monthlyTokenLimit) {
    await audit(req, session, "tenant.quota_change",
      { type: "Tenant", id },
      { from: before.monthlyTokenLimit, to: updated.monthlyTokenLimit });
  }
  if (body.plan !== undefined && before.plan !== updated.plan) {
    await audit(req, session, "tenant.plan_change",
      { type: "Tenant", id },
      { from: before.plan, to: updated.plan });
  }
  // Catch-all for systemPrompt and active.
  if (body.systemPrompt !== undefined || body.active !== undefined) {
    await audit(req, session, "tenant.update",
      { type: "Tenant", id },
      {
        ...(body.systemPrompt !== undefined && { systemPromptChanged: true }),
        ...(body.active !== undefined && { active: { from: before.active, to: updated.active } }),
      });
  }

  return Response.json(updated);
}
