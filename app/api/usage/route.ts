import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/usage — current user's tenant token usage for this month */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const tenantId = session.user.tenantId;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [tenant, agg] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { monthlyTokenLimit: true, plan: true },
    }),
    prisma.message.aggregate({
      where: { tenantId, createdAt: { gte: startOfMonth } },
      _sum: { promptTokens: true, completionTokens: true },
    }),
  ]);

  const used =
    (agg._sum.promptTokens ?? 0) + (agg._sum.completionTokens ?? 0);
  const limit = tenant?.monthlyTokenLimit ?? 500_000;

  return Response.json({ used, limit, plan: tenant?.plan ?? "starter" });
}
