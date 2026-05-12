"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import type { SyntaxHighlighterProps } from "react-syntax-highlighter";

// ── Preview modal ─────────────────────────────────────────────────
const PREVIEWABLE = ["html", "htm", "svg", "mermaid"];

function PreviewModal({ code, language, onClose }: { code: string; language: string; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    if (language === "svg") {
      doc.open();
      doc.write(`<!DOCTYPE html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fa;">${code}</body></html>`);
      doc.close();
    } else if (language === "mermaid") {
      doc.open();
      doc.write(`<!DOCTYPE html><html><head>
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"><\/script>
        <style>body{margin:16px;font-family:sans-serif;background:#fff;}</style>
      </head><body>
        <div class="mermaid">${code}</div>
        <script>mermaid.initialize({startOnLoad:true});<\/script>
      </body></html>`);
      doc.close();
    } else {
      // HTML — inject directly
      doc.open();
      doc.write(code);
      doc.close();
    }
  }, [code, language]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ width: "min(90vw, 900px)", height: "min(85vh, 700px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            ▶ Aperçu · {language}
          </span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-lg leading-none px-1">✕</button>
        </div>
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="flex-1 w-full border-0"
          title="preview"
        />
      </div>
    </div>
  );
}

const LANG_EXT: Record<string, string> = {
  javascript: "js", js: "js", typescript: "ts", ts: "ts",
  tsx: "tsx", jsx: "jsx", python: "py", py: "py",
  java: "java", cpp: "cpp", c: "c", csharp: "cs",
  go: "go", rust: "rs", html: "html", css: "css",
  json: "json", yaml: "yaml", yml: "yml", bash: "sh",
  shell: "sh", sh: "sh", sql: "sql", markdown: "md",
  md: "md", xml: "xml", php: "php", ruby: "rb",
  r: "r", swift: "swift", kotlin: "kt",
};

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);
  const canPreview = PREVIEWABLE.includes((language || "").toLowerCase());

  function handleCopy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const ext = LANG_EXT[language.toLowerCase()] ?? "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const highlighterProps: SyntaxHighlighterProps = {
    style: oneLight,
    language: language || "text",
    PreTag: "div",
    customStyle: { margin: 0, borderRadius: 0, fontSize: "0.8rem", lineHeight: "1.55" },
    children: code,
  };

  return (
    <>
      {preview && (
        <PreviewModal code={code} language={language.toLowerCase()} onClose={() => setPreview(false)} />
      )}
      {/* dir="ltr" keeps code blocks LTR even in Arabic (RTL) UI — W3 */}
      <div className="my-3 rounded-lg overflow-hidden border border-gray-200" dir="ltr">
        <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
          <span className="text-xs text-gray-500 font-mono">{language || "code"}</span>
          <div className="flex gap-1">
            {canPreview && (
              <button
                onClick={() => setPreview(true)}
                className="text-xs text-indigo-600 hover:text-indigo-900 px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors font-medium"
              >
                ▶ Aperçu
              </button>
            )}
            <button
              onClick={handleCopy}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-0.5 rounded hover:bg-gray-200 transition-colors"
            >
              {copied ? "✓ Copié" : "📋 Copier"}
            </button>
            <button
              onClick={handleDownload}
              className="text-xs text-gray-500 hover:text-gray-800 px-2 py-0.5 rounded hover:bg-gray-200 transition-colors"
            >
              ⬇ Fichier
            </button>
          </div>
        </div>
        <SyntaxHighlighter {...highlighterProps} />
      </div>
    </>
  );
}

export function MarkdownMessage({ content }: { content: string }) {
  const components: Components = {
    // Strip the <pre> wrapper — code blocks are fully handled below
    pre({ children }) {
      return <>{children}</>;
    },
    code({ className, children }) {
      const lang = /language-(\w+)/.exec(className || "")?.[1] ?? "";
      const raw = String(children).replace(/\n$/, "");

      // Block code: has a language class OR the source has newlines
      if (lang || raw.includes("\n")) {
        return <CodeBlock language={lang} code={raw} />;
      }

      // Inline code
      return (
        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[0.85em] font-mono text-pink-700">
          {children}
        </code>
      );
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-3">
          <table className="min-w-full text-sm border-collapse border border-gray-200">
            {children}
          </table>
        </div>
      );
    },
    th({ children }) {
      return (
        <th className="px-3 py-2 bg-gray-50 border border-gray-200 font-semibold text-left text-xs uppercase text-gray-600">
          {children}
        </th>
      );
    },
    td({ children }) {
      return <td className="px-3 py-2 border border-gray-200 text-sm">{children}</td>;
    },
    tr({ children }) {
      return <tr className="hover:bg-gray-50">{children}</tr>;
    },
    p({ children }) {
      return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>;
    },
    ul({ children }) {
      return <ul className="list-disc list-outside mb-2.5 space-y-1 pl-5">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal list-outside mb-2.5 space-y-1 pl-5">{children}</ol>;
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>;
    },
    h1({ children }) {
      return <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0 text-gray-900">{children}</h1>;
    },
    h2({ children }) {
      return <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-gray-900">{children}</h2>;
    },
    h3({ children }) {
      return <h3 className="text-base font-semibold mb-1.5 mt-3 first:mt-0 text-gray-900">{children}</h3>;
    },
    h4({ children }) {
      return <h4 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-gray-800">{children}</h4>;
    },
    blockquote({ children }) {
      return (
        <blockquote className="border-l-4 border-indigo-300 pl-4 my-2.5 text-gray-600 italic bg-indigo-50/50 py-1 pr-2 rounded-r">
          {children}
        </blockquote>
      );
    },
    hr() {
      return <hr className="my-4 border-gray-200" />;
    },
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline font-medium"
        >
          {children}
        </a>
      );
    },
    strong({ children }) {
      return <strong className="font-semibold text-gray-900">{children}</strong>;
    },
    em({ children }) {
      return <em className="italic text-gray-700">{children}</em>;
    },
    // Render inline images from web search results
    img({ src, alt }) {
      if (!src) return null;
      return (
        <span className="block my-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? ""}
            loading="lazy"
            className="rounded-xl max-w-full max-h-72 object-contain border border-gray-200 shadow-sm"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          {alt && (
            <span className="block text-xs text-gray-400 mt-1 italic">{alt}</span>
          )}
        </span>
      );
    },
  };

  return (
    <div className="text-sm text-gray-800 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
