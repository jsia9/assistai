import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = session?.user.role ?? "";
  // SECURITY FIX (May 2026, ST-012 / D-ADMIN-USERS):
  // - Previous check `role !== "admin"` excluded superadmin (returned 403 even for jamal).
  // - Previous findMany had NO tenant filter — any admin role saw every tenant's users.
  if (!session || (role !== "admin" && role !== "superadmin")) {
    return new Response("Forbidden", { status: 403 });
  }

  const tenantFilter = role === "superadmin" ? undefined : { tenantId: session.user.tenantId };

  const users = await prisma.user.findMany({
    where: tenantFilter,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastActiveAt: true,
      createdAt: true,
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(users);
}
