import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICE_FCFA, fcfaToUsd, currentPeriod } from "@/lib/billing";

const COST_PER_1K = 0.01;
const MARKUP = 5;

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "";
  if (!session || (role !== "admin" && role !== "superadmin")) {
    return new Response("Forbidden", { status: 403 });
  }

  // Company admin only sees their own tenant; superadmin sees all
  const tenantFilter = role === "superadmin" ? undefined : { id: session.user.tenantId };

  const period = currentPeriod();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [tenants, users, monthlyMessages, recentMessages, payments] =
    await Promise.all([
      prisma.tenant.findMany({
        where: tenantFilter,
        include: {
          users: { select: { id: true, email: true, lastActiveAt: true } },
          messages: {
            where: { createdAt: { gte: startOfMonth } },
            select: { promptTokens: true, completionTokens: true, createdAt: true, role: true },
          },
          payments: {
            where: { period },
            select: { amountFcfa: true, amount: true, type: true, tokensAdded: true },
          },
        },
      }),
      prisma.user.findMany({
        where: {
          ...(tenantFilter ? { tenantId: tenantFilter.id } : {}),
          // Non-superadmin admins must not see superadmin accounts in stats.
          // Mirrors the same guard in GET /api/admin/users.
          ...(role !== "superadmin" ? { role: { not: "superadmin" } } : {}),
        },
        select: {
          id: true,
          email: true,
          name: true,
          active: true,
          lastActiveAt: true,
          role: true,
          tenantId: true,
          tenant: { select: { name: true } },
          conversations: {
            where: { messages: { some: { createdAt: { gte: startOfMonth } } } },
            select: { id: true },
          },
        },
      }),
      prisma.message.count({
        where: {
          createdAt: { gte: startOfMonth },
          role: "user",
          ...(tenantFilter ? { tenantId: tenantFilter.id } : {}),
        },
      }),
      prisma.message.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          role: "user",
          ...(tenantFilter ? { tenantId: tenantFilter.id } : {}),
        },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        where: tenantFilter ? { tenantId: tenantFilter.id } : undefined,
        orderBy: { paidAt: "desc" },
        take: 100,
        include: { tenant: { select: { name: true } } },
      }),
    ]);

  const tenantsWithStats = tenants.map((t) => {
    const tokens = t.messages.reduce(
      (sum: number, m: { promptTokens: number; completionTokens: number }) =>
        sum + m.promptTokens + m.completionTokens,
      0
    );
    const cost = (tokens / 1000) * COST_PER_1K;
    const estimatedRevenue = cost * MARKUP;
    const pctUsed = t.monthlyTokenLimit > 0 ? Math.min(100, (tokens / t.monthlyTokenLimit) * 100) : 0;

    // Calculs FCFA — on privilégie amountFcfa (nouveau champ), fallback sur amount legacy
    const subscriptionPayments = t.payments.filter(
      (p: { type: string }) => p.type === "subscription"
    );
    const topupPayments = t.payments.filter(
      (p: { type: string }) => p.type === "topup"
    );

    const amountPaidFcfa = subscriptionPayments.reduce(
      (s: number, p: { amountFcfa: number; amount: number }) =>
        // Si amountFcfa > 0 (nouveau), on l'utilise ; sinon on convertit amount (legacy USD)
        s + (p.amountFcfa > 0 ? p.amountFcfa : Math.round(p.amount * 600)),
      0
    );
    const topupFcfa = topupPayments.reduce(
      (s: number, p: { amountFcfa: number; amount: number }) =>
        s + (p.amountFcfa > 0 ? p.amountFcfa : Math.round(p.amount * 600)),
      0
    );
    const topupTokensThisMonth = topupPayments.reduce(
      (s: number, p: { tokensAdded: number }) => s + p.tokensAdded,
      0
    );

    const planPriceFcfa = PLAN_PRICE_FCFA[t.plan] ?? 25_000;
    const isPaidThisMonth = amountPaidFcfa >= planPriceFcfa;
    const balanceFcfa = Math.max(0, planPriceFcfa - amountPaidFcfa);

    return {
      id: t.id,
      name: t.name,
      plan: t.plan,
      active: t.active,
      monthlyTokenLimit: t.monthlyTokenLimit,
      systemPrompt: t.systemPrompt ?? null,
      userCount: t.users.length,
      tokensThisMonth: tokens,
      estimatedCost: cost,
      estimatedRevenue,
      // FCFA billing
      planPriceFcfa,
      amountPaidFcfa,
      topupFcfa,
      topupTokensThisMonth,
      balanceFcfa,
      isPaidThisMonth,
      // USD equivalents
      amountPaid: fcfaToUsd(amountPaidFcfa),
      balance: fcfaToUsd(balanceFcfa),
      pctUsed,
    };
  });

  // per-user message counts this month
  const usersWithStats = users.map((u) => ({
    ...u,
    messagesThisMonth: u.conversations.length,
  }));

  const dailyBuckets: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyBuckets[d.toISOString().slice(0, 10)] = 0;
  }
  recentMessages.forEach((row: { createdAt: Date }) => {
    const day = row.createdAt.toISOString().slice(0, 10);
    if (day in dailyBuckets) dailyBuckets[day] += 1;
  });

  const totalPaidFcfa = tenantsWithStats.reduce(
    (s: number, t: { amountPaidFcfa: number }) => s + t.amountPaidFcfa,
    0
  );
  const totalBalanceFcfa = tenantsWithStats.reduce(
    (s: number, t: { balanceFcfa: number }) => s + t.balanceFcfa,
    0
  );
  const overdueCount = tenantsWithStats.filter(
    (t: { isPaidThisMonth: boolean; active: boolean }) => !t.isPaidThisMonth && t.active
  ).length;
  const totalRevenue = tenantsWithStats.reduce(
    (s: number, t: { estimatedRevenue: number }) => s + t.estimatedRevenue,
    0
  );

  return Response.json({
    tenants: tenantsWithStats,
    users: usersWithStats,
    messagesThisMonth: monthlyMessages,
    estimatedRevenue: totalRevenue,
    totalPaid: fcfaToUsd(totalPaidFcfa),
    outstanding: fcfaToUsd(totalBalanceFcfa),
    // FCFA
    totalPaidFcfa,
    totalBalanceFcfa,
    overdueCount,
    period,
    dailyChart: Object.entries(dailyBuckets).map(([date, count]) => ({
      date,
      count,
    })),
    payments,
  });
}
