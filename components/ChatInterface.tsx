"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { MarkdownMessage } from "./MarkdownMessage";
import ProjectPanel from "./ProjectPanel";
import { MODEL_METADATA, type ModelId } from "@/lib/model-coefficients";

interface Attachment {
  type: "image" | "text";
  name: string;
  content: string;
  mimeType?: string;
}

interface GeneratedDocument {
  filename: string;
  mimeType: string;
  base64: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  model?: ModelId; // set on assistant messages
  thinking?: string; // Extended Thinking content
  document?: GeneratedDocument; // generated file attached to this message
  generating?: string; // tool name currently being generated
}

interface TokenUsage {
  used: number;
  limit: number;
  plan: string;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  projectId: string | null;
}

interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  documents: { id: string; name: string; tokenEstimate: number }[];
  conversations: { id: string; title: string; updatedAt: string }[];
}

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "LIYA";

// ── Model definitions (derived from MODEL_METADATA for single source of truth) ──
const MODEL_OPTIONS = (Object.entries(MODEL_METADATA) as [ModelId, typeof MODEL_METADATA[ModelId]][]).map(
  ([id, meta]) => ({ id, ...meta })
);
const DEFAULT_MODEL: ModelId = "claude-sonnet-4-5";

const ACCEPTED_FILES =
  ".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.xml,.yaml,.yml,.html,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.sql,.jpg,.jpeg,.png,.gif,.webp";

export default function ChatInterface({
  userName,
  isAdmin,
}: {
  userName: string;
  isAdmin: boolean;
}) {
  // ── Conversations & projects ─────────────────────────────────
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // ── Current view ─────────────────────────────────────────────
  const [view, setView] = useState<"chat" | "project">("chat");
  const [viewProjectId, setViewProjectId] = useState<string | null>(null); // project panel
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null); // project context for chat

  // ── Chat state ───────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  // ── Token usage ───────────────────────────────────────────────
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setTokenUsage(data); })
      .catch(() => {});
  }, []);

  // Refresh usage after each message completes
  function refreshUsage() {
    fetch("/api/usage")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setTokenUsage(data); })
      .catch(() => {});
  }

  // ── Extended Thinking ─────────────────────────────────────────
  const [extendedThinking, setExtendedThinking] = useState(false);

  // ── Model selection (persisted to localStorage) ──────────────
  const [model, setModel] = useState<ModelId>(() => {
    if (typeof window === "undefined") return DEFAULT_MODEL;
    const saved = localStorage.getItem("kamali_model");
    return (MODEL_OPTIONS.map((m) => m.id) as string[]).includes(saved ?? "")
      ? (saved as ModelId)
      : DEFAULT_MODEL;
  });

  // ── Opus toast ────────────────────────────────────────────────
  const [opusToast, setOpusToast] = useState(false);

  function selectModel(id: ModelId) {
    setModel(id);
    localStorage.setItem("kamali_model", id);
    if (id === "claude-opus-4-5") {
      const seen = typeof window !== "undefined" && localStorage.getItem("liya_opus_toast_seen");
      if (!seen) {
        setOpusToast(true);
        localStorage.setItem("liya_opus_toast_seen", "1");
        setTimeout(() => setOpusToast(false), 5000);
      }
    }
  }

  // ── Conversation rename ───────────────────────────────────────
  const [renamingConvId, setRenamingConvId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function commitRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      await loadConversations();
    }
    setRenamingConvId(null);
  }

  // ── Export conversation ───────────────────────────────────────
  function exportConversation() {
    if (messages.length === 0) return;
    const lines: string[] = [`# Conversation ${APP_NAME}\n`, `_Exporté le ${new Date().toLocaleString("fr-FR")}_\n`];
    for (const m of messages) {
      if (m.role === "user") {
        lines.push(`\n---\n\n**Vous**\n\n${m.content}`);
      } else {
        const modelLabel = MODEL_OPTIONS.find((o) => o.id === m.model)?.label ?? APP_NAME;
        lines.push(`\n---\n\n**${modelLabel}**\n\n${m.thinking ? `> 💭 *Réflexion interne disponible*\n\n` : ""}${m.content}`);
      }
    }
    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-kamali-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── UI ───────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Loaders ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  const loadProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) setProjects(await res.json());
  }, []);

  useEffect(() => {
    loadConversations();
    loadProjects();
  }, [loadConversations, loadProjects]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Derive sidebar groupings ──────────────────────────────────
  const noProjectConvs = conversations.filter((c) => !c.projectId);

  // ── Conversation actions ──────────────────────────────────────
  async function loadConversation(id: string, projId?: string | null) {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setCurrentConvId(id);
    setCurrentProjectId(projId ?? data.projectId ?? null);
    setMessages(
      data.messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }))
    );
    setView("chat");
    setSidebarOpen(false);
  }

  function newConversation(projectId?: string) {
    setCurrentConvId(null);
    setCurrentProjectId(projectId ?? null);
    setMessages([]);
    setPendingAttachments([]);
    setView("chat");
    setSidebarOpen(false);
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (currentConvId === id) newConversation();
    await loadConversations();
  }

  // ── Project actions ───────────────────────────────────────────
  function openProject(id: string) {
    setViewProjectId(id);
    setView("project");
    setSidebarOpen(false);
  }

  function toggleProjectExpand(id: string) {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim() }),
    });
    if (res.ok) {
      const proj = await res.json();
      await loadProjects();
      setNewProjectName("");
      setShowNewProject(false);
      openProject(proj.id);
    }
    setCreatingProject(false);
  }

  // ── Core send logic ───────────────────────────────────────────
  async function doSend(
    text: string,
    attachs: Attachment[],
    convId: string | null,
    projId: string | null,
    isRegen: boolean,
    selectedModel: ModelId = model
  ) {
    setStreaming(true);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, attachments: attachs },
      { role: "assistant", content: "", model: selectedModel },
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
          projectId: projId,
          model: selectedModel,
          extendedThinking: extendedThinking && selectedModel !== "claude-haiku-4-5",
        }),
      });

      if (!res.ok || !res.body) {
        let errMsg = "Une erreur s'est produite. Veuillez réessayer.";
        if (res.status === 402) {
          try { const json = await res.json(); errMsg = json.message ?? errMsg; } catch { /* ignore */ }
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
          if (raw === "[DONE]") { await loadConversations(); refreshUsage(); break; }
          try {
            const payload = JSON.parse(raw);
            if (payload.conversationId) setCurrentConvId(payload.conversationId);
            if (payload.model) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], model: payload.model as ModelId };
                return copy;
              });
            }
            if (payload.thinking) {
              setMessages((prev) => {
                const copy = [...prev];
                const last = copy[copy.length - 1];
                copy[copy.length - 1] = { ...last, thinking: (last.thinking ?? "") + payload.thinking };
                return copy;
              });
            }
            if (payload.text) {
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + payload.text };
                return copy;
              });
            }
            if (payload.generating) {
              // Show "generating document" spinner on assistant message
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { ...copy[copy.length - 1], generating: payload.generating };
                return copy;
              });
            }
            if (payload.document) {
              // Attach generated document to current assistant message
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = {
                  ...copy[copy.length - 1],
                  generating: undefined,
                  document: payload.document,
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
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: "Connexion perdue. Vérifiez votre réseau et réessayez." };
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
    doSend(text, attachs, currentConvId, currentProjectId, false, model);
  }

  function regenerate() {
    if (streaming || messages.length < 2) return;
    const copy = [...messages];
    if (copy[copy.length - 1].role !== "assistant" || copy[copy.length - 2].role !== "user") return;
    const lastUser = copy[copy.length - 2];
    setMessages(copy.slice(0, -2));
    doSend(lastUser.content, lastUser.attachments ?? [], currentConvId, currentProjectId, true, model);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const el = textareaRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 120) + "px"; }
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
        if (res.ok) { const att: Attachment = await res.json(); setPendingAttachments((prev) => [...prev, att]); }
        else alert(`Erreur : ${await res.text()}`);
      } catch { alert("Erreur lors du chargement du fichier."); }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(idx: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Files already in conversation context ────────────────────
  // Extract filenames from stored messages (format: "[Fichier : name]" or "[Image : name]")
  const filesInContext = messages
    .filter((m) => m.role === "user")
    .flatMap((m) => {
      const matches = [...m.content.matchAll(/\[(?:Fichier|Image) : ([^\]]+)\]/g)];
      return matches.map((match) => match[1]);
    })
    .filter((v, i, a) => a.indexOf(v) === i); // deduplicate

  // ── Current project info (for chat header) ────────────────────
  const currentProject = currentProjectId ? projects.find((p) => p.id === currentProjectId) : null;

  return (
    <div className="flex h-screen bg-aria-sand overflow-hidden">
      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-10 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-bold text-aria-indigo font-display text-lg">{APP_NAME}</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">

          {/* New conversation (no project) */}
          <div className="px-3 mb-2">
            <button
              onClick={() => newConversation()}
              className="w-full bg-aria-terracotta text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-aria-terracotta-dark transition-colors"
            >
              + Nouvelle conversation
            </button>
          </div>

          {/* ── PROJECTS section ─────────────────────────── */}
          <div className="px-3 mb-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-aria-stone uppercase tracking-wider px-1">Projets</span>
              <button
                onClick={() => setShowNewProject((v) => !v)}
                className="text-aria-indigo hover:text-aria-indigo text-xs px-1"
                title="Nouveau projet"
              >
                +
              </button>
            </div>

            {showNewProject && (
              <div className="mt-1.5 flex gap-1">
                <input
                  autoFocus
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") createProject(); if (e.key === "Escape") { setShowNewProject(false); setNewProjectName(""); } }}
                  placeholder="Nom du projet…"
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-aria-indigo focus:ring-0"
                />
                <button
                  onClick={createProject}
                  disabled={creatingProject || !newProjectName.trim()}
                  className="text-xs bg-aria-terracotta text-white px-2 py-1 rounded-lg disabled:opacity-50"
                >
                  ✓
                </button>
              </div>
            )}
          </div>

          {projects.length === 0 && (
            <p className="text-xs text-gray-400 px-4 py-1">Aucun projet</p>
          )}

          {projects.map((proj) => {
            const projConvs = conversations.filter((c) => c.projectId === proj.id);
            const isExpanded = expandedProjects.has(proj.id);
            return (
              <div key={proj.id}>
                <div
                  className={`group flex items-center gap-1 px-3 py-1.5 cursor-pointer rounded-lg mx-1 text-sm ${view === "project" && viewProjectId === proj.id ? "bg-aria-indigo-light text-aria-indigo" : "text-aria-anthracite hover:bg-aria-sand"}`}
                >
                  <button
                    onClick={() => toggleProjectExpand(proj.id)}
                    className="text-gray-400 hover:text-gray-600 w-4 flex-shrink-0 text-center"
                  >
                    {isExpanded ? "▾" : "▸"}
                  </button>
                  <span
                    className="flex-1 truncate font-medium text-sm"
                    onClick={() => openProject(proj.id)}
                  >
                    📁 {proj.name}
                  </span>
                  <button
                    onClick={() => { newConversation(proj.id); if (!isExpanded) toggleProjectExpand(proj.id); }}
                    className="opacity-0 group-hover:opacity-100 text-aria-indigo text-xs"
                    title="Nouvelle conversation dans ce projet"
                  >
                    +
                  </button>
                </div>

                {isExpanded && (
                  <div className="ml-6 border-l border-gray-200 pl-2 space-y-0.5 mb-1">
                    {projConvs.length === 0 && (
                      <p className="text-xs text-gray-400 px-2 py-1">Aucune conversation</p>
                    )}
                    {projConvs.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => loadConversation(c.id, proj.id)}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer text-xs ${currentConvId === c.id && view === "chat" ? "bg-aria-indigo-light text-aria-indigo" : "text-aria-stone hover:bg-aria-sand"}`}
                      >
                        <span className="truncate flex-1">{c.title}</span>
                        <button
                          onClick={(e) => deleteConversation(c.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── CONVERSATIONS section ─────────────────────── */}
          {noProjectConvs.length > 0 && (
            <div className="mt-3 px-3 mb-1">
              <span className="text-[11px] font-semibold text-aria-stone uppercase tracking-wider px-1">Conversations</span>
            </div>
          )}

          {noProjectConvs.map((c) => (
            <div
              key={c.id}
              onClick={() => { if (renamingConvId !== c.id) loadConversation(c.id); }}
              className={`group flex items-center justify-between px-3 py-2 mx-1 rounded-lg cursor-pointer text-sm ${currentConvId === c.id && view === "chat" ? "bg-aria-indigo-light text-aria-indigo" : "text-aria-anthracite hover:bg-aria-sand"}`}
            >
              {renamingConvId === c.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(c.id);
                    if (e.key === "Escape") setRenamingConvId(null);
                    e.stopPropagation();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 text-xs bg-white border border-aria-indigo/50 rounded px-1.5 py-0.5 focus:outline-none focus:ring-0 text-gray-800"
                />
              ) : (
                <>
                  <span
                    className="truncate flex-1"
                    onDoubleClick={(e) => { e.stopPropagation(); setRenameValue(c.title); setRenamingConvId(c.id); }}
                    title="Double-cliquer pour renommer"
                  >
                    {c.title}
                  </span>
                  <button
                    onClick={(e) => deleteConversation(c.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 ml-1 text-xs px-1"
                  >✕</button>
                </>
              )}
            </div>
          ))}

          {conversations.length === 0 && projects.length === 0 && (
            <p className="text-xs text-gray-400 px-4 py-4 text-center">Aucune conversation</p>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          {/* Token usage bar */}
          {tokenUsage && (
            <div className="space-y-1 px-1">
              <div className="flex items-center justify-between text-[10px] text-gray-400">
                <span>Tokens ce mois</span>
                <span className="font-medium text-gray-500">
                  {(tokenUsage.used / 1000).toFixed(0)}k / {(tokenUsage.limit / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    tokenUsage.used / tokenUsage.limit > 0.9
                      ? "bg-red-400"
                      : tokenUsage.used / tokenUsage.limit > 0.7
                      ? "bg-amber-400"
                      : "bg-aria-indigo"
                  }`}
                  style={{ width: `${Math.min(100, (tokenUsage.used / tokenUsage.limit) * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
          )}

          {isAdmin && (
            <Link href="/admin" className="block w-full text-center text-xs text-aria-indigo hover:underline py-1">
              Administration
            </Link>
          )}
          <Link href="/billing" className="flex items-center gap-1.5 w-full text-xs text-aria-stone hover:text-aria-indigo hover:bg-aria-indigo-light rounded-lg px-2 py-1.5 transition-colors">
            <span>💳</span>
            <span>Facturation</span>
          </Link>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate flex-1">{userName}</span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="text-xs text-gray-500 hover:text-red-500 ml-2">
              Déconnexion
            </button>
          </div>
          <p className="text-[10px] text-gray-300 text-center pt-1">
            Powered by <span className="text-orange-400 font-medium">Claude</span>
          </p>
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">☰</button>
          <span className="font-semibold text-gray-800">{APP_NAME}</span>
        </header>

        {/* ── PROJECT PANEL view ────────────────────────────── */}
        {view === "project" && viewProjectId && (
          <ProjectPanel
            projectId={viewProjectId}
            onBack={() => setView("chat")}
            onStartConversation={(projId) => newConversation(projId)}
            onProjectDeleted={async () => {
              await loadProjects();
              await loadConversations();
              setView("chat");
              setViewProjectId(null);
            }}
            onProjectUpdated={async () => {
              await loadProjects();
            }}
          />
        )}

        {/* ── CHAT view ─────────────────────────────────────── */}
        {view === "chat" && (
          <>
            {/* Project context banner */}
            {currentProject && (
              <div className="bg-aria-indigo-light border-b border-aria-indigo/10 px-4 py-2 flex items-center gap-2 text-sm">
                <span className="text-aria-indigo">📁</span>
                <span className="text-aria-indigo font-medium">{currentProject.name}</span>
                <span className="text-aria-stone text-xs ml-auto">
                  {currentProject.documents.length} doc{currentProject.documents.length !== 1 ? "s" : ""} · contexte actif
                </span>
                <button
                  onClick={() => openProject(currentProject.id)}
                  className="text-xs text-aria-indigo hover:underline ml-2"
                >
                  ⚙ Gérer
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-2">
                  <div className="text-4xl">{currentProject ? "📁" : "💬"}</div>
                  <p className="text-base font-medium text-gray-500">
                    {currentProject
                      ? `Projet : ${currentProject.name}`
                      : "Bonjour ! Comment puis-je vous aider ?"}
                  </p>
                  <p className="text-sm">
                    {currentProject
                      ? `${currentProject.documents.length} document(s) disponible(s) dans le contexte.`
                      : "Posez une question, joignez un fichier ou démarrez une conversation."}
                  </p>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "user" ? (
                    <UserBubble message={m} />
                  ) : (
                    <AssistantBubble
                      message={m}
                      isLast={i === messages.length - 1}
                      streaming={streaming}
                      onRegenerate={regenerate}
                      currentModel={model}
                    />
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Pending attachments */}
            {pendingAttachments.length > 0 && (
              <div className="px-4 pt-2 bg-white border-t border-gray-100">
                <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
                  {pendingAttachments.map((att, idx) => (
                    <AttachmentChip key={idx} attachment={att} onRemove={() => removeAttachment(idx)} />
                  ))}
                </div>
              </div>
            )}

            {/* Files already in context (from previous messages in this conversation) */}
            {filesInContext.length > 0 && (
              <div className="bg-amber-50 border-t border-amber-100 px-4 py-1.5">
                <div className="max-w-3xl mx-auto flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide flex-shrink-0">
                    📂 En contexte :
                  </span>
                  {filesInContext.map((fname, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1"
                    >
                      <span>📄</span>
                      <span className="truncate max-w-[150px]">{fname}</span>
                    </span>
                  ))}
                  <span className="text-[10px] text-amber-500 italic ml-auto">
                    Claude a accès à ces fichiers
                  </span>
                </div>
              </div>
            )}

            {/* Opus toast notification */}
            {opusToast && (
              <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-purple-700 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg max-w-xs text-center animate-fade-in">
                Opus consomme 5× plus de tokens que Sonnet. Votre quota sera déduit en conséquence.
              </div>
            )}

            {/* Model selector + Extended Thinking + Export */}
            <div className="bg-white border-t border-gray-100 px-4 pt-2 pb-1">
              <div className="max-w-3xl mx-auto flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-gray-400 mr-1 flex-shrink-0">Modèle :</span>
                {MODEL_OPTIONS.map((opt) => {
                  const active = model === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => selectModel(opt.id as ModelId)}
                      title={`${opt.description} — ${opt.coeffLabel} tokens`}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                        active ? opt.activeBg : `${opt.bg} ${opt.color} hover:opacity-80`
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                      <span className={`text-[9px] opacity-70 font-normal ${active ? "opacity-80" : ""}`}>
                        {opt.coeffLabel}
                      </span>
                    </button>
                  );
                })}
                {model === "claude-opus-4-5" && (
                  <span className="text-[10px] text-purple-500 ml-1 italic">
                    · consomme 5× plus de tokens
                  </span>
                )}

                {/* Extended Thinking toggle */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => model !== "claude-haiku-4-5" && setExtendedThinking((v) => !v)}
                    disabled={model === "claude-haiku-4-5"}
                    title={
                      model === "claude-haiku-4-5"
                        ? "Non disponible avec Haiku"
                        : extendedThinking
                        ? "Désactiver la réflexion étendue"
                        : "Activer la réflexion étendue (Sonnet/Opus)"
                    }
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      model === "claude-haiku-4-5"
                        ? "border-gray-200 text-gray-300 cursor-not-allowed bg-white"
                        : extendedThinking
                        ? "bg-violet-600 border-violet-600 text-white"
                        : "border-gray-200 text-gray-500 bg-white hover:border-violet-300 hover:text-violet-600"
                    }`}
                  >
                    <span>🧠</span>
                    <span>Réflexion</span>
                  </button>

                  {/* Export conversation */}
                  {messages.length > 0 && (
                    <button
                      onClick={exportConversation}
                      title="Exporter la conversation en Markdown"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 text-gray-500 bg-white hover:border-aria-indigo/40 hover:text-aria-indigo transition-all"
                    >
                      <span>📥</span>
                      <span>Exporter</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 bg-white px-4 py-3">
              <div className="flex items-end gap-2 max-w-3xl mx-auto">
                <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_FILES} className="hidden" onChange={handleFileSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={streaming || uploading}
                  title="Joindre un fichier"
                  className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border transition-colors ${uploading ? "border-aria-indigo/40 text-aria-indigo animate-pulse" : "border-gray-300 text-gray-500 hover:border-aria-indigo hover:text-aria-indigo"} disabled:opacity-40`}
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
                  placeholder="Tapez votre message… (Entrée pour envoyer)"
                  className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0 disabled:opacity-50 max-h-28 leading-relaxed"
                />
                <button
                  onClick={sendMessage}
                  disabled={streaming || (!input.trim() && pendingAttachments.length === 0)}
                  className="bg-aria-terracotta text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-aria-terracotta-dark transition-colors disabled:opacity-40 flex-shrink-0"
                >
                  {streaming ? "..." : "Envoyer"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */
function UserBubble({ message }: { message: Message }) {
  const images = message.attachments?.filter((a) => a.type === "image") ?? [];
  const files = message.attachments?.filter((a) => a.type === "text") ?? [];
  return (
    <div className="max-w-[85%] sm:max-w-[70%] space-y-1.5">
      {images.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={`data:${img.mimeType};base64,${img.content}`} alt={img.name} className="rounded-xl max-h-64 w-auto block ml-auto" />
      ))}
      {files.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5 bg-aria-indigo text-white text-xs px-3 py-1.5 rounded-xl ml-auto w-fit">
          <span>📄</span><span className="truncate max-w-[200px]">{f.name}</span>
        </div>
      ))}
      {message.content && (
        <div className="bg-aria-indigo text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      )}
    </div>
  );
}

function AssistantBubble({ message, isLast, streaming, onRegenerate, currentModel }: {
  message: Message; isLast: boolean; streaming: boolean; onRegenerate: () => void; currentModel: ModelId;
}) {
  const [copied, setCopied] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  function handleCopy() { navigator.clipboard.writeText(message.content); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  // Which model generated this message?
  const msgModel = message.model ?? currentModel;
  const modelMeta = MODEL_OPTIONS.find((m) => m.id === msgModel);

  return (
    <div className="max-w-[85%] sm:max-w-[75%] group">
      {/* Model badge — shown above each assistant bubble */}
      {modelMeta && (
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <span>{modelMeta.icon}</span>
            <span className={`font-medium ${modelMeta.color}`}>{modelMeta.label}</span>
          </span>
        </div>
      )}

      {/* Extended Thinking collapsible block */}
      {message.thinking && (
        <div className="mb-2">
          <button
            onClick={() => setThinkingOpen((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-violet-500 hover:text-violet-700 font-medium transition-colors"
          >
            <span>🧠</span>
            <span>Réflexion interne</span>
            <span className="text-[10px]">{thinkingOpen ? "▲ masquer" : "▼ afficher"}</span>
          </button>
          {thinkingOpen && (
            <div className="mt-1.5 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-xs text-violet-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-mono">
              {message.thinking}
            </div>
          )}
        </div>
      )}

      {/* Streaming thinking indicator (while thinking but no answer yet) */}
      {isLast && streaming && message.thinking && message.content === "" && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-violet-400 italic">
          <span>🧠</span>
          <span>En train de réfléchir…</span>
          <TypingIndicator />
        </div>
      )}

      {/* Generating document spinner */}
      {message.generating && (
        <div className="mb-2 flex items-center gap-2 text-[12px] text-aria-indigo bg-aria-indigo-light border border-aria-indigo/20 rounded-xl px-3 py-2">
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-aria-indigo border-t-transparent rounded-full" />
          <span>
            {message.generating === "generate_powerpoint" && "Génération du PowerPoint…"}
            {message.generating === "generate_excel"      && "Génération du fichier Excel…"}
            {message.generating === "generate_word"       && "Génération du document Word…"}
          </span>
        </div>
      )}

      <div className="bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3">
        {message.content === "" && isLast && streaming && !message.thinking ? <TypingIndicator /> : <MarkdownMessage content={message.content} />}
      </div>

      {/* Generated document download button */}
      {message.document && (
        <DocumentDownloadButton doc={message.document} />
      )}

      {message.content && (
        <div className={`flex items-center gap-1 mt-1 transition-opacity ${isLast ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
          <button onClick={handleCopy} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors">
            {copied ? "✓ Copié" : "📋 Copier"}
          </button>
          {isLast && !streaming && (
            <button onClick={onRegenerate} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-0.5 rounded hover:bg-gray-100 transition-colors">
              🔄 Régénérer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Document download button ────────────────────────────────── */
function DocumentDownloadButton({ doc }: { doc: GeneratedDocument }) {
  const ext = doc.filename.split(".").pop()?.toLowerCase() ?? "";

  const icons: Record<string, string> = {
    pptx: "📊",
    xlsx: "📗",
    docx: "📄",
  };
  const labels: Record<string, string> = {
    pptx: "PowerPoint",
    xlsx: "Excel",
    docx: "Word",
  };

  function download() {
    const bytes  = Uint8Array.from(atob(doc.base64), c => c.charCodeAt(0));
    const blob   = new Blob([bytes], { type: doc.mimeType });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      className="mt-2 flex items-center gap-2.5 bg-aria-indigo-light hover:bg-aria-indigo hover:text-white text-aria-indigo border border-aria-indigo/30 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all group/dl"
    >
      <span className="text-lg">{icons[ext] ?? "📁"}</span>
      <span className="flex-1 text-left">
        <span className="block text-xs font-normal opacity-70">{labels[ext] ?? "Document"} généré</span>
        <span>{doc.filename}</span>
      </span>
      <span className="text-xs opacity-60 group-hover/dl:opacity-100">⬇ Télécharger</span>
    </button>
  );
}

function AttachmentChip({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  if (attachment.type === "image") {
    return (
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:${attachment.mimeType};base64,${attachment.content}`} alt={attachment.name} className="h-12 w-12 object-cover rounded-lg border border-gray-200" />
        <button onClick={onRemove} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 max-w-[160px]">
      <span>📄</span><span className="truncate">{attachment.name}</span>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 ml-0.5 flex-shrink-0">✕</button>
    </div>
  );
}

function TypingIndicator() {
  return (
    <span className="flex gap-1 items-center h-4">
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

