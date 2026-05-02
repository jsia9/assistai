import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const payments = await prisma.payment.findMany({
    include: { tenant: { select: { name: true } } },
    orderBy: { paidAt: "desc" },
    take: 100,
  });

  return Response.json(payments);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { tenantId, amount, currency, method, reference, period, notes } =
    await req.json();

  if (!tenantId || !amount || !period) {
    return new Response("tenantId, amount et period sont requis", {
      status: 400,
    });
  }

  const payment = await prisma.payment.create({
    data: {
      tenantId,
      amount: Number(amount),
      currency: currency ?? "USD",
      method: method ?? "manual",
      reference: reference ?? null,
      period,
      notes: notes ?? null,
      createdById: session.user.id,
    },
    include: { tenant: { select: { name: true } } },
  });

  return Response.json(payment, { status: 201 });
}
