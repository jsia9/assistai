"use client";

import { useState } from "react";
import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AssistAI";

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [lang, setLang] = useState<"fr" | "en">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("lang") as "fr" | "en") ?? "fr";
    }
    return "fr";
  });
  const [form, setForm] = useState({ name: "", company: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  const t = {
    hero: {
      fr: "L'IA professionnelle pour l'Afrique de l'Ouest",
      en: "Professional AI for West Africa",
    },
    sub: {
      fr: "Un assistant intelligent, conçu pour les entreprises francophones.",
      en: "An intelligent assistant, built for francophone businesses.",
    },
    feat1: {
      fr: "Français d'abord — réponses précises en français ou en anglais",
      en: "French-first — precise answers in French or English",
    },
    feat2: {
      fr: "Sécurisé & conforme RGPD — vos données restent en Europe",
      en: "Secure & GDPR compliant — your data stays in Europe",
    },
    feat3: {
      fr: "Conçu pour l'Afrique — droit OHADA, BCEAO, UEMOA",
      en: "Built for Africa — OHADA, BCEAO, UEMOA expertise",
    },
    cta: { fr: "Demander l'accès", en: "Request access" },
    login: { fr: "Se connecter", en: "Sign in" },
    modalTitle: { fr: "Demander l'accès", en: "Request access" },
    name: { fr: "Nom complet", en: "Full name" },
    company: { fr: "Entreprise", en: "Company" },
    email: { fr: "Adresse e-mail", en: "Email address" },
    send: { fr: "Envoyer la demande", en: "Send request" },
    sent: {
      fr: "Demande envoyée ! Nous vous contacterons bientôt.",
      en: "Request sent! We will contact you soon.",
    },
    err: {
      fr: "Erreur d'envoi. Réessayez.",
      en: "Send error. Please retry.",
    },
  };

  function toggleLang() {
    const next = lang === "fr" ? "en" : "fr";
    setLang(next);
    localStorage.setItem("lang", next);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <span className="text-xl font-bold text-indigo-600">{APP_NAME}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-200"
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
          <Link
            href="/login"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            {t.login[lang]}
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 max-w-xl leading-tight">
          {t.hero[lang]}
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-md">{t.sub[lang]}</p>

        <ul className="mt-8 space-y-3 text-left max-w-sm w-full">
          {[t.feat1[lang], t.feat2[lang], t.feat3[lang]].map((f) => (
            <li key={f} className="flex items-start gap-2 text-gray-700">
              <span className="mt-1 text-indigo-500">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button
          onClick={() => setShowModal(true)}
          className="mt-10 bg-indigo-600 text-white px-8 py-3 rounded-lg text-base font-semibold hover:bg-indigo-700 transition-colors"
        >
          {t.cta[lang]}
        </button>
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t.modalTitle[lang]}
            </h2>
            {status === "done" ? (
              <p className="text-green-600 py-4">{t.sent[lang]}</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <input
                  required
                  type="text"
                  placeholder={t.name[lang]}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <input
                  required
                  type="text"
                  placeholder={t.company[lang]}
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <input
                  required
                  type="email"
                  placeholder={t.email[lang]}
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {status === "error" && (
                  <p className="text-red-500 text-sm">{t.err[lang]}</p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {status === "loading" ? "..." : t.send[lang]}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
