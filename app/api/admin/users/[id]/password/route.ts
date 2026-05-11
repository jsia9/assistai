import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, canManageUser } from "@/lib/roles";
import { audit } from "@/lib/audit";
import bcrypt from "bcryptjs";

/** PATCH /api/admin/users/[id]/password — change a user's password */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const { password } = await req.json();

  if (!password || (password as string).length < 6) {
    return new Response("Le mot de passe doit contenir au moins 6 caractères", {
      status: 400,
    });
  }

  // Load the target user to check tenant ownership
  const target = await prisma.user.findUnique({ where: { id }, select: { tenantId: true, email: true } });
  if (!target) return new Response("Not found", { status: 404 });

  if (!canManageUser(session.user.role, session.user.tenantId, target.tenantId)) {
    return new Response("Forbidden", { status: 403 });
  }

  const passwordHash = await bcrypt.hash(password as string, 12);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  await audit(req, session, "user.password_reset",
    { type: "User", id },
    { targetEmail: target.email, targetTenant: target.tenantId });

  return new Response(null, { status: 204 });
}
