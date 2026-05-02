import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updated = await prisma.tenant.update({
    where: { id },
    data: {
      ...(body.monthlyTokenLimit !== undefined && {
        monthlyTokenLimit: Number(body.monthlyTokenLimit),
      }),
      ...(body.plan !== undefined && { plan: body.plan }),
      ...(body.active !== undefined && { active: body.active }),
    },
  });

  return Response.json(updated);
}
