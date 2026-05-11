import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, canManageUser } from "@/lib/roles";
import { audit } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { tenantId: true, active: true, email: true } });
  if (!user) return new Response("Not found", { status: 404 });

  if (!canManageUser(session.user.role, session.user.tenantId, user.tenantId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });

  await audit(req, session,
    updated.active ? "user.unsuspend" : "user.suspend",
    { type: "User", id },
    { targetEmail: user.email, targetTenant: user.tenantId });

  return Response.json({ active: updated.active });
}
