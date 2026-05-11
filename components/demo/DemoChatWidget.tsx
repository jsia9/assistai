"use client";

import { useState, useRef, useEffect } from "react";

interface DemoMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 5;

export default function DemoChatWidget() {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState<DemoMessage[]>([]);
  const [input, setInput]             = useState("");
  const [streaming, setStreaming]     = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [showUpsell, setShowUpsell]   = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);

  /* Greeting on first open */
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Bonjour ! Je suis LIYA, l'IA pour les entreprises africaines. Posez-moi une question — par exemple : « Aide-moi à rédiger un courrier commercial » ou « Synthétise ce rapport ».",
      }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Scroll to bottom */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || streaming || showUpsell) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setStreaming(true);

    // Add empty assistant slot
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });

      if (res.status === 429) {
        setShowUpsell(true);
        setMessages(prev => prev.slice(0, -1));
        setStreaming(false);
        return;
      }

      const reader = res.body!.getReader();
      const dec    = new TextDecoder();
      let content  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = dec.decode(value).split("\n").filter(l => l.startsWith("data: "));
        for (const line of lines) {
          const raw = line.slice(6);
          if (raw === "[DONE]") break;
          try {
            const data = JSON.parse(raw);
            if (data.sessionCount !== undefined) setSessionCount(data.sessionCount);
            if (data.upsell) setShowUpsell(true);
            if (data.text) {
              content += data.text;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content };
                return next;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: "Une erreur s'est produite. Réessayez." };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  const remaining = MAX_MESSAGES - sessionCount;

  return (
    <>
      {/* ── Pill trigger ────────────────────────────────────────── */}
      {!open && (
        <button
          data-demo-trigger
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-aria-terracotta text-white font-semibold text-[15px] px-6 py-3.5 rounded-full shadow-xl hover:bg-aria-terracotta-dark hover:-translate-y-0.5 transition-all"
        >
          {/* Pulse dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-aria-ochre opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-aria-ochre" />
          </span>
          Essayer LIYA gratuitement
        </button>
      )}

      {/* ── Chat panel ──────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-[#C8C2B5] overflow-hidden"
          style={{ width: "380px", maxWidth: "calc(100vw - 32px)", height: "520px" }}
        >
          {/* Header — Indigo sombre comme le mockup */}
          <div className="bg-aria-indigo text-white px-6 py-5 flex items-start justify-between flex-shrink-0">
            <div>
              <h4 className="font-display text-[18px] font-semibold mb-1">
                Essayez LIYA — démo gratuite
              </h4>
              <p className="text-[13px] opacity-70">5 messages gratuits, sans inscription</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white text-[24px] leading-none ml-4 -mt-1 transition-colors"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>

          {/* Counter bar */}
          <div className="bg-[#EFE9DD] border-b border-[#C8C2B5] px-6 py-3 text-[13px] text-aria-stone text-center flex-shrink-0">
            <strong className="text-aria-terracotta">
              {remaining > 0
                ? `${remaining} message${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`
                : "Quota atteint"}
            </strong>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-[14px] leading-[1.5] ${
                  m.role === "user"
                    ? "bg-aria-indigo text-white self-end rounded-br-sm"
                    : "bg-aria-sand text-aria-anthracite self-start rounded-bl-sm"
                }`}
              >
                {m.content || (streaming && m.role === "assistant"
                  ? <span className="animate-pulse text-aria-stone">…</span>
                  : null
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Upsell */}
          {showUpsell && (
            <div className="mx-4 mb-3 bg-aria-indigo-light border border-aria-indigo/20 rounded-xl p-4 text-center flex-shrink-0">
              <p className="text-[13px] text-aria-indigo font-medium mb-3">
                Vous avez utilisé vos {MAX_MESSAGES} messages gratuits.<br />
                Créez un compte pour continuer.
              </p>
              <a
                href="/login"
                className="inline-block bg-aria-terracotta text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg hover:bg-aria-terracotta-dark transition-colors"
              >
                Créer mon compte →
              </a>
            </div>
          )}

          {/* Input */}
          {!showUpsell && (
            <div className="border-t border-[#C8C2B5] px-4 py-3 flex gap-2 items-end flex-shrink-0">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder="Tapez votre message…"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-[14px] text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo transition-colors disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={streaming || !input.trim()}
                className="bg-aria-terracotta text-white rounded-lg px-4 py-2.5 font-semibold text-[15px] hover:bg-aria-terracotta-dark transition-colors disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-[#C8C2B5] px-4 py-2 text-[11px] text-aria-stone text-center flex-shrink-0">
            Powered by Claude (Haiku) · <span className="text-aria-terracotta font-semibold">Anthropic</span>
          </div>
        </div>
      )}
    </>
  );
}
