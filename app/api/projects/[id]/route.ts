import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** GET /api/projects/[id] — full project detail */
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      documents: {
        select: { id: true, name: true, tokenEstimate: true, sizeBytes: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      conversations: {
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) return new Response("Not found", { status: 404 });
  return Response.json(project);
}

/** PUT /api/projects/[id] — update name or instructions */
export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { name, instructions } = await req.json();

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!project) return new Response("Not found", { status: 404 });

  const updated = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(instructions !== undefined && { instructions: instructions?.trim() || null }),
    },
    include: {
      documents: {
        select: { id: true, name: true, tokenEstimate: true, sizeBytes: true, createdAt: true },
      },
      conversations: {
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  return Response.json(updated);
}

/** DELETE /api/projects/[id] — delete project and its documents */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!project) return new Response("Not found", { status: 404 });

  // Documents cascade-delete via schema; conversations get projectId set to null
  await prisma.project.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
