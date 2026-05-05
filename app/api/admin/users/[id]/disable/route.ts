import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, canManageUser } from "@/lib/roles";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { tenantId: true, active: true } });
  if (!user) return new Response("Not found", { status: 404 });

  if (!canManageUser(session.user.role, session.user.tenantId, user.tenantId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });

  return Response.json({ active: updated.active });
}
