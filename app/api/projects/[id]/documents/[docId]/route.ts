import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; docId: string }> };

/** DELETE /api/projects/[id]/documents/[docId] */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id: projectId, docId } = await params;

  // Ensure the project belongs to this user
  const doc = await prisma.projectDocument.findFirst({
    where: { id: docId, projectId, project: { userId: session.user.id } },
  });
  if (!doc) return new Response("Not found", { status: 404 });

  await prisma.projectDocument.delete({ where: { id: docId } });

  // Touch project updatedAt
  await prisma.project.update({
    where: { id: projectId },
    data: { updatedAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
