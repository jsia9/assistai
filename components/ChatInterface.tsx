"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { MarkdownMessage } from "./MarkdownMessage";

interface Attachment {
  type: "image" | "text";
  name: string;
  content: string;
  mimeType?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AssistAI";

const ACCEPTED_FILES =
  ".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.xml,.yaml,.yml,.html,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.sql,.jpg,.jpeg,.png,.gif,.webp";

export default function ChatInterface({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setCurrentConvId(id);
    setMessages(
      data.messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }))
    );
    setSidebarOpen(false);
  }

  function newConversation() {
    setCurrentConvId(null);
    setMessages([]);
    setPendingAttachments([]);
    setSidebarOpen(false);
  }

  // ── Core send logic (shared by sendMessage and regenerate) ─────
  async function doSend(
    text: string,
    attachs: Attachment[],
    convId: string | null,
    isRegen: boolean
  ) {
    setStreaming(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, attachments: attachs },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          message: text,
          attachments: attachs,
          regenerate: isRegen,
        }),
      });

      if (!res.ok || !res.body) {
        let errMsg = "Une erreur s'est produite. Veuillez réessayer.";
        if (res.status === 402) {
          try {
            const json = await res.json();
            errMsg = json.message ?? errMsg;
          } catch { /* ignore */ }
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: errMsg };
          return copy;
        });
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") {
            await loadConversations();
            break;
          }
          try {
            const payload = JSON.parse(raw);
            if (payload.conversationId) {
              setCurrentConvId(payload.conversationId);
            }
            if (payload.text) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  role: "assistant",
                  content: copy[copy.length - 1].content + payload.text,
                };
                return copy;
              });
            }
            if (payload.error) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: payload.error };
                return copy;
              });
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Connexion perdue. Vérifiez votre réseau et réessayez.",
        };
        return copy;
      });
    }

    setStreaming(false);
  }

  function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    const attachs = [...pendingAttachments];
    setInput("");
    setPendingAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    doSend(text, attachs, currentConvId, false);
  }

  function regenerate() {
    if (streaming || messages.length < 2) return;
    const copy = [...messages];
    // Need last pair to be user + assistant
    if (
      copy[copy.length - 1].role !== "assistant" ||
      copy[copy.length - 2].role !== "user"
    ) return;
    const lastUserMsg = copy[copy.length - 2];
    // Remove the last user + assistant from UI
    setMessages(copy.slice(0, -2));
    // Re-send (regenerate flag tells API to delete & re-create DB entries)
    doSend(lastUserMsg.content, lastUserMsg.attachments ?? [], currentConvId, true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: form });
        if (res.ok) {
          const att: Attachment = await res.json();
          setPendingAttachments((prev) => [...prev, att]);
        } else {
          const msg = await res.text();
          alert(`Erreur : ${msg}`);
        }
      } catch {
        alert("Erreur lors du chargement du fichier.");
      }
    }

    setUploading(false);
    // Reset input so the same file can be re-added
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(idx: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (currentConvId === id) newConversation();
    await loadConversations();
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="p-4 border-b border-gray-100">
          <span className="font-bold text-indigo-600 text-lg">{APP_NAME}</span>
        </div>

        <div className="p-3">
          <button
            onClick={newConversation}
            className="w-full bg-indigo-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Nouvelle conversation
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => loadConversation(c.id)}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
                currentConvId === c.id
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="truncate flex-1">{c.title}</span>
              <button
                onClick={(e) => deleteConversation(c.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 text-xs px-1"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-gray-400 px-3 py-4 text-center">
              Aucune conversation
            </p>
          )}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-1">
          {isAdmin && (
            <Link
              href="/admin"
              className="block w-full text-center text-xs text-indigo-600 hover:underline py-1"
            >
              Administration
            </Link>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate flex-1">{userName}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-xs text-gray-500 hover:text-red-500 ml-2"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            ☰
          </button>
          <span className="font-semibold text-gray-800">{APP_NAME}</span>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2">
              <div className="text-4xl">💬</div>
              <p className="text-base font-medium text-gray-500">
                Bonjour ! Comment puis-je vous aider ?
              </p>
              <p className="text-sm">
                Posez une question, joignez un fichier ou démarrez une conversation.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "user" ? (
                <UserBubble message={m} />
              ) : (
                <AssistantBubble
                  message={m}
                  isLast={i === messages.length - 1}
                  streaming={streaming}
                  onRegenerate={regenerate}
                />
              )}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Pending attachments preview */}
        {pendingAttachments.length > 0 && (
          <div className="px-4 pt-2 bg-white border-t border-gray-100">
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
              {pendingAttachments.map((att, idx) => (
                <AttachmentChip
                  key={idx}
                  attachment={att}
                  onRemove={() => removeAttachment(idx)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_FILES}
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming || uploading}
              title="Joindre un fichier (PDF, Word, Excel, image…)"
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${
                uploading
                  ? "border-indigo-300 text-indigo-400 animate-pulse"
                  : "border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600"
              } disabled:opacity-40`}
            >
              {uploading ? "⏳" : "📎"}
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={autoGrow}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={streaming}
              placeholder="Tapez votre message… (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)"
              className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 max-h-28 leading-relaxed"
            />
            <button
              onClick={sendMessage}
              disabled={streaming || (!input.trim() && pendingAttachments.length === 0)}
              className="bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {streaming ? "..." : "Envoyer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── User message bubble ─────────────────────────────────────────── */
function UserBubble({ message }: { message: Message }) {
  const images = message.attachments?.filter((a) => a.type === "image") ?? [];
  const files = message.attachments?.filter((a) => a.type === "text") ?? [];

  return (
    <div className="max-w-[85%] sm:max-w-[70%] space-y-1.5">
      {/* Image previews */}
      {images.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={`data:${img.mimeType};base64,${img.content}`}
          alt={img.name}
          className="rounded-xl max-h-64 w-auto block ml-auto"
        />
      ))}
      {/* File badges */}
      {files.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5 bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-xl ml-auto w-fit">
          <span>📄</span>
          <span className="truncate max-w-[200px]">{f.name}</span>
        </div>
      ))}
      {/* Text */}
      {message.content && (
        <div className="bg-indigo-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      )}
    </div>
  );
}

/* ── Assistant message bubble ────────────────────────────────────── */
function AssistantBubble({
  message,
  isLast,
  streaming,
  onRegenerate,
}: {
  message: Message;
  isLast: boolean;
  streaming: boolean;
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-[85%] sm:max-w-[75%] group">
      <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
        {message.content === "" && isLast && streaming ? (
          <TypingIndicator />
        ) : (
          <MarkdownMessage content={message.content} />
        )}
      </div>

      {/* Action toolbar — appears on hover or when this is the last message */}
      {message.content && (
        <div className={`flex items-center gap-1 mt-1 transition-opacity ${
          isLast ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}>
          <button
            onClick={handleCopy}
            className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
          >
            {copied ? "✓ Copié" : "📋 Copier"}
          </button>
          {isLast && !streaming && (
            <button
              onClick={onRegenerate}
              className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors"
            >
              🔄 Régénérer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Attachment chip (in input area preview) ─────────────────────── */
function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  if (attachment.type === "image") {
    return (
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:${attachment.mimeType};base64,${attachment.content}`}
          alt={attachment.name}
          className="h-12 w-12 object-cover rounded-lg border border-gray-200"
        />
        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 max-w-[160px]">
      <span>📄</span>
      <span className="truncate">{attachment.name}</span>
      <button
        onClick={onRemove}
        className="text-gray-400 hover:text-red-500 ml-0.5 flex-shrink-0"
      >
        ✕
      </button>
    </div>
  );
}

/* ── Typing indicator ────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <span className="flex gap-1 items-center h-4">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

