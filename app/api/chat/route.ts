import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { MODEL_COEFFICIENTS, DEFAULT_COEFFICIENT } from "@/lib/model-coefficients";
import {
  PLAN_ALLOWED_MODELS,
  PLAN_NO_EXTENDED_THINKING,
  PLAN_MAX_DAYS,
} from "@/lib/billing";
import { DOCUMENT_TOOLS, isDocumentTool } from "@/lib/skills/tools";
import { generatePptx } from "@/lib/skills/generate-pptx";
import { generateXlsx } from "@/lib/skills/generate-xlsx";
import { generateDocx } from "@/lib/skills/generate-docx";

const COST_PER_1K = 0.01;
const MARKUP = 5;

// Allowed model identifiers. Keep in sync with MODEL_OPTIONS in ChatInterface.tsx.
const ALLOWED_MODELS = [
  "claude-haiku-4-5",
  "claude-sonnet-4-5",
  "claude-opus-4-5",
] as const;
type AllowedModel = (typeof ALLOWED_MODELS)[number];
const DEFAULT_MODEL: AllowedModel = "claude-sonnet-4-5";

interface Attachment {
  type: "image" | "text";
  name: string;
  content: string;
  mimeType?: string;
}

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = await req.json();
  const {
    conversationId,
    message,
    attachments = [],
    regenerate = false,
    projectId: bodyProjectId = null,
    model: rawModel = DEFAULT_MODEL,
    extendedThinking = false,
    forceWebSearch = false,
  } = body as {
    conversationId: string | null;
    message: string;
    attachments: Attachment[];
    regenerate: boolean;
    projectId: string | null;
    model: string;
    extendedThinking: boolean;
    forceWebSearch: boolean;
  };

  // Validate model — fall back to default if client sends an unexpected value
  const model: AllowedModel = (ALLOWED_MODELS as readonly string[]).includes(rawModel)
    ? (rawModel as AllowedModel)
    : DEFAULT_MODEL;

  // Cap message length to prevent token abuse (100 KB ≈ 25 000 tokens)
  if (!message?.trim()) return new Response("Message requis", { status: 400 });
  if (message.length > 100_000) return new Response("Message trop long (max 100 000 caractères)", { status: 400 });

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

  // ── Plan lifecycle enforcement ────────────────────────────────
  const plan = tenant?.plan ?? "starter";
  const now  = Date.now();

  // 1. Trial expiry (72 h)
  if (plan === "trial") {
    const trialEndsAt = (tenant as { trialEndsAt?: Date | null })?.trialEndsAt;
    if (trialEndsAt && now > trialEndsAt.getTime()) {
      return new Response(
        JSON.stringify({
          error: "trial_expired",
          message:
            "Votre essai gratuit de 72 h est terminé. Passez à un forfait payant pour continuer.",
          upgrade: true,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 2. Découverte plan — max 3 months
  if (plan === "decouverte") {
    const planStartedAt = (tenant as { planStartedAt?: Date | null })?.planStartedAt;
    const maxDays = PLAN_MAX_DAYS["decouverte"] ?? 92;
    if (planStartedAt && now > planStartedAt.getTime() + maxDays * 24 * 60 * 60 * 1000) {
      return new Response(
        JSON.stringify({
          error: "plan_expired",
          message:
            "Votre période Découverte (3 mois) est terminée. Passez au forfait Premium pour continuer à utiliser Opus et la réflexion approfondie.",
          upgrade: true,
        }),
        { status: 402, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // 3. Model restriction by plan
  const allowedModels = PLAN_ALLOWED_MODELS[plan];
  if (allowedModels && !allowedModels.includes(model)) {
    return new Response(
      JSON.stringify({
        error: "model_not_allowed",
        message:
          plan === "trial"
            ? "L'essai gratuit est limité aux modèles Haiku et Sonnet. Passez à un forfait payant pour accéder à Opus."
            : `Le modèle ${model} n'est pas disponible dans votre forfait actuel.`,
        upgrade: true,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. Extended Thinking restriction by plan
  if (extendedThinking && PLAN_NO_EXTENDED_THINKING.has(plan)) {
    return new Response(
      JSON.stringify({
        error: "feature_not_allowed",
        message:
          plan === "trial"
            ? "La réflexion approfondie n'est pas disponible dans l'essai gratuit."
            : "La réflexion approfondie n'est pas incluse dans le forfait Découverte. Passez au forfait Premium.",
        upgrade: true,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── Conversation setup ────────────────────────────────────────
  let convId = conversationId as string | null;
  let resolvedProjectId: string | null = bodyProjectId;

  if (!convId) {
    const conv = await prisma.conversation.create({
      data: {
        userId,
        title: message.slice(0, 40),
        ...(resolvedProjectId && { projectId: resolvedProjectId }),
      },
    });
    convId = conv.id;
  } else {
    // Verify conversation ownership — MUST return 404 on mismatch.
    // Without this guard, any authenticated user can supply an arbitrary
    // conversationId and read another user's message history, write into their
    // conversation, or delete their messages via regenerate=true (IDOR).
    const existingConv = await prisma.conversation.findFirst({
      where: { id: convId, userId },
      select: { projectId: true },
    });
    if (!existingConv) return new Response("Not found", { status: 404 });
    if (existingConv.projectId) resolvedProjectId = existingConv.projectId;
  }

  // ── Regenerate: delete last user+assistant pair ───────────────
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

  // ── Load project context ──────────────────────────────────────
  let projectSystemPrompt: string | null = null;
  if (resolvedProjectId) {
    const project = await prisma.project.findFirst({
      where: { id: resolvedProjectId, userId },
      include: { documents: { select: { name: true, content: true }, orderBy: { createdAt: "asc" } } },
    });
    if (project) {
      const parts: string[] = [];
      if (project.instructions?.trim()) {
        parts.push(project.instructions.trim());
      }
      if (project.documents.length > 0) {
        const docsBlock = project.documents
          .map((d) => `### ${d.name}\n\n${d.content}`)
          .join("\n\n---\n\n");
        parts.push(`=== DOCUMENTS DU PROJET ===\n\n${docsBlock}`);
      }
      if (parts.length > 0) projectSystemPrompt = parts.join("\n\n");
    }
  }

  // ── Build history ─────────────────────────────────────────────
  const history = await prisma.message.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  // ── Build user content block ──────────────────────────────────
  type ContentBlock = Anthropic.TextBlockParam | Anthropic.ImageBlockParam;
  const userContent: ContentBlock[] = [];

  for (const att of attachments.filter((a) => a.type === "text")) {
    userContent.push({ type: "text", text: `[Fichier joint : ${att.name}]\n\n${att.content}\n\n---` });
  }
  for (const att of attachments.filter((a) => a.type === "image")) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: att.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: att.content,
      },
    });
  }
  userContent.push({ type: "text", text: message });

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

  // ── W7: Maghreb/Darija prompt addendum ───────────────────────
  const tenantRegion = (tenant as { region?: string })?.region ?? "WA";
  const tenantCountryCode = (tenant as { countryCode?: string })?.countryCode ?? (tenant?.country ?? "SN");

  const MAGHREB_SYSTEM_ADDENDUM = tenantRegion === "MAGHREB" ? `

Le tenant est basé ${tenantCountryCode === "MA" ? "au Maroc" : tenantCountryCode === "TN" ? "en Tunisie" : "en Algérie"}. L'utilisateur peut écrire en :
- Arabe standard moderne (الفصحى)
- Darija marocaine ou arabe tunisien (en caractères arabes ou en transcription latine "arabizi")
- Français
- Code-switching entre ces langues

Règles de réponse :
1. Réponds dans la même langue que la dernière question de l'utilisateur.
2. Si l'utilisateur écrit en Darija/dialecte, tu peux répondre en Darija si tu en es capable, sinon en arabe standard simple et compréhensible, en évitant le vocabulaire trop classique ou littéraire.
3. Si l'utilisateur mélange français et arabe, tu peux faire de même.
4. Les termes techniques, juridiques et financiers peuvent rester en français même dans une réponse en arabe — c'est l'usage courant au Maroc et en Tunisie.
${tenantCountryCode === "MA" ? "5. Pour le Maroc : utilise les références juridiques marocaines (Code de commerce, Code du travail marocain, CNDP, Bank Al-Maghrib) plutôt qu'OHADA." : ""}
${tenantCountryCode === "TN" ? "5. Pour la Tunisie : utilise les références juridiques tunisiennes (Code des sociétés commerciales, INPDP, BCT)." : ""}` : "";

  // ── System prompt: project > tenant > global + addendum ───────
  const baseSystemPrompt =
    projectSystemPrompt ||
    (tenant?.systemPrompt?.trim() || null) ||
    SYSTEM_PROMPT;

  const webSearchAddendum = forceWebSearch
    ? "\n\nINSTRUCTION OBLIGATOIRE POUR CE MESSAGE : 1) Utilise web_search pour trouver des informations récentes. 2) Utilise web_fetch sur les pages trouvées pour extraire les URLs directes des images. 3) Affiche les images en haut de ta réponse avec la syntaxe exacte : ![description](URL_image) — une par ligne, avant le texte. 4) Cite tes sources. L'affichage d'images est OBLIGATOIRE si des visuels existent pour ce sujet."
    : "";

  const systemPrompt = [
    MAGHREB_SYSTEM_ADDENDUM ? `${baseSystemPrompt}\n\n${MAGHREB_SYSTEM_ADDENDUM}` : baseSystemPrompt,
    webSearchAddendum,
  ].join("").trim();

  // ── Stored content (no base64 images in DB) ───────────────────
  const storedUserContent =
    attachments.filter((a) => a.type === "text").map((a) => `[Fichier : ${a.name}]\n${a.content}\n---\n`).join("") +
    attachments.filter((a) => a.type === "image").map((a) => `[Image : ${a.name}]\n`).join("") +
    message;

  const encoder = new TextEncoder();
  let inputTokens = 0;
  let outputTokens = 0;
  let fullContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ conversationId: convId, model })}\n\n`)
        );

        // Extended Thinking requires Sonnet or Opus (not Haiku).
        const thinkingEnabled =
          extendedThinking && model !== "claude-haiku-4-5";

        // Extended Thinking needs at least 16k max_tokens; give it 16k thinking + 4k answer.
        // Opus gets 16k to handle long web search results without truncation.
        const maxTokens = thinkingEnabled
          ? 20000
          : model === "claude-opus-4-5"
          ? 16384
          : 8192;

        // Web search + web fetch are server-side tools — Anthropic executes them
        // autonomously when Claude judges it necessary.
        // Disabled when Extended Thinking is active (API restriction).
        const WEB_SEARCH_TOOL: Anthropic.WebSearchTool20250305 = {
          type: "web_search_20250305",
          name: "web_search",
        };
        // web_fetch lets Claude retrieve a full page to extract image URLs etc.
        const WEB_FETCH_TOOL: Anthropic.WebFetchTool20250910 = {
          type: "web_fetch_20250910",
          name: "web_fetch",
        };

        const streamParams: Parameters<typeof anthropic.messages.stream>[0] = {
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
          // Disable ALL tools when extended thinking is active (API restriction)
          ...(!thinkingEnabled && { tools: [WEB_SEARCH_TOOL, WEB_FETCH_TOOL, ...DOCUMENT_TOOLS] }),
          ...(thinkingEnabled && {
            thinking: { type: "enabled", budget_tokens: 10000 },
          }),
        };

        const anthropicStream = anthropic.messages.stream(streamParams);

        let thinkingContent = "";

        // Tool use tracking
        let pendingToolName = "";
        let pendingToolId   = "";
        let pendingToolJson = "";

        for await (const event of anthropicStream) {
          // Thinking block deltas (Extended Thinking)
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "thinking_delta"
          ) {
            thinkingContent += event.delta.thinking;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ thinking: event.delta.thinking })}\n\n`
              )
            );
          }
          // Regular text deltas — also clear the web-search indicator
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullContent += event.delta.text;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text, searching: false })}\n\n`
              )
            );
          }
          // Server-side tool start — signal activity to client
          if (event.type === "content_block_start" && event.content_block.type === "server_tool_use") {
            const toolName = (event.content_block as Anthropic.ServerToolUseBlock).name;
            if (toolName === "web_search") {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ searching: "search" })}\n\n`
              ));
            } else if (toolName === "web_fetch") {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ searching: "fetch" })}\n\n`
              ));
            }
          }
          // Tool use — capture name + id
          if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            pendingToolName = event.content_block.name;
            pendingToolId   = event.content_block.id;
            pendingToolJson = "";
          }
          // Tool use — accumulate input JSON
          if (event.type === "content_block_delta" && event.delta.type === "input_json_delta") {
            pendingToolJson += event.delta.partial_json;
          }
          if (event.type === "message_delta" && event.usage)
            outputTokens = event.usage.output_tokens;
          if (event.type === "message_start" && event.message.usage)
            inputTokens = event.message.usage.input_tokens;
        }

        // ── Execute document tool if Claude called one ───────────
        if (pendingToolName && isDocumentTool(pendingToolName)) {
          try {
            // Signal "generating" to client
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ generating: pendingToolName })}\n\n`
            ));

            const toolInput = JSON.parse(pendingToolJson);
            let fileBuffer: Buffer;
            let mimeType: string;
            let ext: string;

            if (pendingToolName === "generate_powerpoint") {
              fileBuffer = await generatePptx(toolInput);
              mimeType   = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
              ext        = "pptx";
            } else if (pendingToolName === "generate_excel") {
              fileBuffer = generateXlsx(toolInput);
              mimeType   = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
              ext        = "xlsx";
            } else {
              fileBuffer = await generateDocx(toolInput);
              mimeType   = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
              ext        = "docx";
            }

            const filename = `${(toolInput.filename as string).replace(/[^a-z0-9_\-]/gi, "_")}.${ext}`;
            const base64   = fileBuffer.toString("base64");

            // Send file to client as a special SSE event
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ document: { filename, mimeType, base64 } })}\n\n`
            ));

            // Ask Claude to explain what was generated (second turn)
            const toolResultMessages: Anthropic.MessageParam[] = [
              ...messages,
              {
                role: "assistant" as const,
                content: [{ type: "tool_use" as const, id: pendingToolId, name: pendingToolName, input: toolInput }],
              },
              {
                role: "user" as const,
                content: [{
                  type: "tool_result" as const,
                  tool_use_id: pendingToolId,
                  content: `Fichier "${filename}" généré avec succès (${fileBuffer.length} octets).`,
                }],
              },
            ];

            const followUpStream = anthropic.messages.stream({
              model,
              max_tokens: 1024,
              system: systemPrompt,
              messages: toolResultMessages,
            });

            for await (const ev of followUpStream) {
              if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
                fullContent += ev.delta.text;
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ text: ev.delta.text })}\n\n`
                ));
              }
              if (ev.type === "message_delta" && ev.usage)
                outputTokens += ev.usage.output_tokens;
            }
          } catch (toolErr) {
            console.error("Document generation error:", toolErr);
            const errMsg = "\n\n⚠️ Une erreur s'est produite lors de la génération du document. Veuillez réessayer.";
            fullContent += errMsg;
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ text: errMsg })}\n\n`
            ));
          }
        }

        const coefficient = MODEL_COEFFICIENTS[model] ?? DEFAULT_COEFFICIENT;
        const billedInput  = Math.ceil(inputTokens  * coefficient);
        const billedOutput = Math.ceil(outputTokens * coefficient);

        await prisma.message.createMany({
          data: [
            {
              conversationId: convId!,
              tenantId,
              role: "user",
              content: storedUserContent,
              promptTokens:     billedInput,
              completionTokens: 0,
              realTokensUsed:   inputTokens,
              modelCoefficient: coefficient,
            },
            {
              conversationId: convId!,
              tenantId,
              role: "assistant",
              content: fullContent,
              promptTokens:     0,
              completionTokens: billedOutput,
              realTokensUsed:   outputTokens,
              modelCoefficient: coefficient,
            },
          ],
        });

        const conv = await prisma.conversation.findUnique({ where: { id: convId! } });
        if (conv?.title === "Nouvelle conversation") {
          await prisma.conversation.update({ where: { id: convId! }, data: { title: message.slice(0, 40) } });
        }

        await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (err) {
        console.error("Chat API error:", err);
        // Surface Anthropic API errors clearly (invalid model, quota, etc.)
        let userMsg = "Une erreur s'est produite. Veuillez réessayer.";
        if (err && typeof err === "object") {
          const apiErr = err as { status?: number; message?: string; error?: { message?: string } };
          if (apiErr.status === 404 || (apiErr.message ?? "").includes("model")) {
            userMsg = `Modèle "${model}" non disponible. Veuillez sélectionner Haiku ou Sonnet.`;
          } else if (apiErr.status === 429) {
            userMsg = "Limite de débit Anthropic atteinte. Réessayez dans quelques secondes.";
          } else if (apiErr.status === 401) {
            userMsg = "Clé API invalide. Contactez l'administrateur.";
          } else if (apiErr.message) {
            userMsg = `Erreur : ${apiErr.message}`;
          }
        }
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: userMsg })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
