import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const transactionId = req.nextUrl.searchParams.get("tx");
  if (!transactionId) return new Response("tx requis", { status: 400 });

  const payment = await prisma.payment.findUnique({
    where: { transactionId },
    select: {
      id: true,
      tenantId: true,
      status: true,
      amountFcfa: true,
      operator: true,
      paidAt: true,
      type: true,
      tokensAdded: true,
      failureReason: true,
    },
  });

  if (!payment) return new Response("Transaction introuvable", { status: 404 });

  // Only the payment's tenant can query it
  if (payment.tenantId !== session.user.tenantId) {
    return new Response("Forbidden", { status: 403 });
  }

  return Response.json({
    status: payment.status,
    amountFcfa: payment.amountFcfa,
    operator: payment.operator,
    paidAt: payment.paidAt,
    type: payment.type,
    tokensAdded: payment.tokensAdded,
    failureReason: payment.failureReason,
  });
}
