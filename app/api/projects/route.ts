import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET /api/projects — list all projects for the current user */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
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

  return Response.json(projects);
}

/** POST /api/projects — create a new project */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { name, instructions } = await req.json();
  if (!name?.trim()) return new Response("Le nom est requis", { status: 400 });

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      instructions: instructions?.trim() || null,
      userId: session.user.id,
      tenantId: session.user.tenantId,
    },
    include: {
      documents: true,
      conversations: true,
    },
  });

  return Response.json(project, { status: 201 });
}
