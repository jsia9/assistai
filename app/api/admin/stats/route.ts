import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COST_PER_1K = 0.01;
const MARKUP = 5;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [tenants, users, monthlyMessages, recentMessages, payments] =
    await Promise.all([
      prisma.tenant.findMany({
        include: {
          users: { select: { id: true, email: true, lastActiveAt: true } },
          messages: {
            where: { createdAt: { gte: startOfMonth } },
            select: { promptTokens: true, completionTokens: true, createdAt: true, role: true },
          },
          payments: {
            where: { period: startOfMonth.toISOString().slice(0, 7) },
            select: { amount: true },
          },
        },
      }),
      prisma.user.findMany({
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
        where: { createdAt: { gte: startOfMonth }, role: "user" },
      }),
      prisma.message.findMany({
        where: { createdAt: { gte: thirtyDaysAgo }, role: "user" },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        orderBy: { paidAt: "desc" },
        take: 50,
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
    const revenue = cost * MARKUP;
    const paid = t.payments.reduce((s: number, p: { amount: number }) => s + p.amount, 0);
    const pctUsed = t.monthlyTokenLimit > 0 ? Math.min(100, (tokens / t.monthlyTokenLimit) * 100) : 0;

    // per-user breakdown
    const userStats = t.users.map((u: { id: string; email: string; lastActiveAt: Date }) => {
      const userMsgs = t.messages.filter((m: { role: string }) => m.role === "user");
      const userTokens = t.messages
        .filter(() => true)
        .reduce(
          (s: number, m: { promptTokens: number; completionTokens: number }) =>
            s + m.promptTokens + m.completionTokens,
          0
        );
      return {
        id: u.id,
        email: u.email,
        lastActiveAt: u.lastActiveAt,
        messagesThisMonth: userMsgs.length,
        tokensThisMonth: userTokens,
      };
    });

    return {
      id: t.id,
      name: t.name,
      plan: t.plan,
      active: t.active,
      monthlyTokenLimit: t.monthlyTokenLimit,
      userCount: t.users.length,
      tokensThisMonth: tokens,
      estimatedCost: cost,
      estimatedRevenue: revenue,
      amountPaid: paid,
      balance: revenue - paid,
      pctUsed,
      userStats,
    };
  });

  // per-user message counts this month (across all tenants)
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

  const totalRevenue = tenantsWithStats.reduce(
    (s: number, t: { estimatedRevenue: number }) => s + t.estimatedRevenue,
    0
  );
  const totalPaid = tenantsWithStats.reduce(
    (s: number, t: { amountPaid: number }) => s + t.amountPaid,
    0
  );

  return Response.json({
    tenants: tenantsWithStats,
    users: usersWithStats,
    messagesThisMonth: monthlyMessages,
    estimatedRevenue: totalRevenue,
    totalPaid,
    outstanding: totalRevenue - totalPaid,
    dailyChart: Object.entries(dailyBuckets).map(([date, count]) => ({
      date,
      count,
    })),
    payments,
  });
}
