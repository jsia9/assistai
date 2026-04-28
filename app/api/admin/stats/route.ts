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

  const [tenants, users, monthlyMessages, recentMessages] = await Promise.all([
    prisma.tenant.findMany({
      include: {
        users: { select: { id: true } },
        messages: {
          where: { createdAt: { gte: startOfMonth } },
          select: { promptTokens: true, completionTokens: true },
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
        tenant: { select: { name: true } },
      },
    }),
    prisma.message.count({
      where: { createdAt: { gte: startOfMonth }, role: "user" },
    }),
    prisma.message.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, role: "user" },
      select: { createdAt: true },
    }),
  ]);

  const tenantsWithStats = tenants.map((t) => {
    const tokens = t.messages.reduce(
      (sum: number, m: { promptTokens: number; completionTokens: number }) =>
        sum + m.promptTokens + m.completionTokens,
      0
    );
    const cost = (tokens / 1000) * COST_PER_1K;
    return {
      id: t.id,
      name: t.name,
      plan: t.plan,
      active: t.active,
      userCount: t.users.length,
      tokensThisMonth: tokens,
      estimatedCost: cost,
      estimatedRevenue: cost * MARKUP,
    };
  });

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

  return Response.json({
    tenants: tenantsWithStats,
    users,
    messagesThisMonth: monthlyMessages,
    estimatedRevenue: totalRevenue,
    dailyChart: Object.entries(dailyBuckets).map(([date, count]) => ({
      date,
      count,
    })),
  });
}
