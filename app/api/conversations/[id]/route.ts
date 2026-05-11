import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) return new Response("Not found", { status: 404 });
  return Response.json(conversation);
}

/** PATCH /api/conversations/[id] — rename */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 100) : null;
  if (!title) return new Response("Title required", { status: 400 });

  const conv = await prisma.conversation.findFirst({ where: { id, userId: session.user.id } });
  if (!conv) return new Response("Not found", { status: 404 });

  const updated = await prisma.conversation.update({
    where: { id },
    data: { title },
    select: { id: true, title: true },
  });
  return Response.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  await prisma.message.deleteMany({ where: { conversationId: id } });
  await prisma.conversation.deleteMany({
    where: { id, userId: session.user.id },
  });

  return new Response(null, { status: 204 });
}
