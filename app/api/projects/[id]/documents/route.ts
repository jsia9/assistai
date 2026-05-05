import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** POST /api/projects/[id]/documents — add a document to a project */
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id: projectId } = await params;

  // Ensure the project belongs to this user
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return new Response("Not found", { status: 404 });

  const { name, content, mimeType, sizeBytes } = await req.json();
  if (!name || !content)
    return new Response("name et content sont requis", { status: 400 });

  const tokenEstimate = Math.ceil((content as string).length / 4);

  const doc = await prisma.projectDocument.create({
    data: {
      projectId,
      name,
      content,
      mimeType: mimeType ?? null,
      sizeBytes: sizeBytes ?? 0,
      tokenEstimate,
    },
  });

  // Touch project updatedAt
  await prisma.project.update({
    where: { id: projectId },
    data: { updatedAt: new Date() },
  });

  return Response.json(doc, { status: 201 });
}
