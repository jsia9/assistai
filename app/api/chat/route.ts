import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const COST_PER_1K = 0.01;
const MARKUP = 5;

interface Attachment {
  type: "image" | "text";
  name: string;
  content: string;   // base64 for images, plain text for text
  mimeType?: string;
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const { conversationId, message, attachments = [], regenerate = false } = body as {
    conversationId: string | null;
    message: string;
    attachments: Attachment[];
    regenerate: boolean;
  };

  if (!message?.trim()) return new Response("Message requis", { status: 400 });

  const userId = session.user.id;
  const tenantId = session.user.tenantId;

  // ── Quota check ───────────────────────────────────────────────
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [tenant, monthlyUsage] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.message.aggregate({
      where: { tenantId, createdAt: { gte: startOfMonth } },
      _sum: { promptTokens: true, completionTokens: true },
    }),
  ]);

  const tokensUsed =
    (monthlyUsage._sum.promptTokens ?? 0) +
    (monthlyUsage._sum.completionTokens ?? 0);
  const limit = tenant?.monthlyTokenLimit ?? 500000;

  if (tokensUsed >= limit) {
    const costSoFar = (tokensUsed / 1000) * COST_PER_1K * MARKUP;
    return new Response(
      JSON.stringify({
        error: "quota_exceeded",
        message: `Votre quota mensuel de ${limit.toLocaleString("fr-FR")} tokens est atteint. Contactez l'administrateur pour augmenter votre limite. (Consommation : ${tokensUsed.toLocaleString("fr-FR")} tokens — valeur estimée : $${costSoFar.toFixed(2)})`,
      }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }
  // ─────────────────────────────────────────────────────────────

  let convId = conversationId as string | null;

  if (!convId) {
    const conv = await prisma.conversation.create({
      data: { userId, title: message.slice(0, 40) },
    });
    convId = conv.id;
  }

  // ── If regenerating, remove the last user+assistant pair ───────
  if (regenerate && convId) {
    const last2 = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    if (last2.length > 0) {
      await prisma.message.deleteMany({
        where: { id: { in: last2.map((m) => m.id) } },
      });
    }
  }

  // ── Build conversation history ─────────────────────────────────
  const history = await prisma.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  // ── Build the user content block ──────────────────────────────
  type ContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam;
  const userContent: ContentBlock[] = [];

  // Text attachments: prepend as context
  const textAttachments = attachments.filter((a) => a.type === "text");
  for (const att of textAttachments) {
    userContent.push({
      type: "text",
      text: `[Fichier joint : ${att.name}]\n\n${att.content}\n\n---`,
    });
  }

  // Image attachments: add as image blocks
  const imageAttachments = attachments.filter((a) => a.type === "image");
  for (const att of imageAttachments) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: att.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: att.content,
      },
    });
  }

  // The actual user text
  userContent.push({ type: "text", text: message });

  // ── Build messages array for Anthropic ────────────────────────
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user" as const,
      content: userContent.length === 1 ? message : userContent,
    },
  ];

  // ── Determine system prompt (tenant-specific overrides global) ─
  const systemPrompt =
    (tenant?.systemPrompt ?? "").trim() || SYSTEM_PROMPT;

  // ── Build stored user message content ─────────────────────────
  const storedUserContent =
    textAttachments.map((a) => `[Fichier : ${a.name}]\n${a.content}\n---\n`).join("") +
    imageAttachments.map((a) => `[Image : ${a.name}]\n`).join("") +
    message;

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
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
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
              content: storedUserContent,
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
