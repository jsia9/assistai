"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import type { SyntaxHighlighterProps } from "react-syntax-highlighter";

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
    <div className="my-3 rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
        <span className="text-xs text-gray-500 font-mono">{language || "code"}</span>
        <div className="flex gap-1">
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
  };

  return (
    <div className="text-sm text-gray-800 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
