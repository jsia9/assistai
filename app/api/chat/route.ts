import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { conversationId, message } = await req.json();
  if (!message?.trim()) return new Response("Message requis", { status: 400 });

  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  let convId = conversationId as string | null;

  if (!convId) {
    const conv = await prisma.conversation.create({
      data: { userId, title: message.slice(0, 40) },
    });
    convId = conv.id;
  }

  const history = await prisma.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const encoder = new TextEncoder();
  let inputTokens = 0;
  let outputTokens = 0;
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`)
        );

        const anthropicStream = anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullContent += event.delta.text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
          if (event.type === "message_delta" && event.usage) {
            outputTokens = event.usage.output_tokens;
          }
          if (event.type === "message_start" && event.message.usage) {
            inputTokens = event.message.usage.input_tokens;
          }
        }

        await prisma.message.createMany({
          data: [
            {
              conversationId: convId!,
              tenantId,
              role: "user",
              content: message,
              promptTokens: inputTokens,
              completionTokens: 0,
            },
            {
              conversationId: convId!,
              tenantId,
              role: "assistant",
              content: fullContent,
              promptTokens: 0,
              completionTokens: outputTokens,
            },
          ],
        });

        const conv = await prisma.conversation.findUnique({
          where: { id: convId! },
        });
        if (conv?.title === "Nouvelle conversation") {
          await prisma.conversation.update({
            where: { id: convId! },
            data: { title: message.slice(0, 40) },
          });
        }

        await prisma.user.update({
          where: { id: userId },
          data: { lastActiveAt: new Date() },
        });

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        console.error("Chat API error:", err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Une erreur s'est produite. Veuillez réessayer." })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
