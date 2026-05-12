"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "LIYA";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      if (res.error === "Compte suspendu") {
        setError("Votre compte a été suspendu. Contactez l'administrateur.");
      } else {
        setError("Email ou mot de passe incorrect.");
      }
    } else {
      router.push("/chat");
    }
  }

  return (
    <div className="min-h-screen bg-aria-sand flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-[#E8E2D6] p-8">

        {/* Wordmark */}
        <div className="text-center mb-7">
          <h1 className="font-display text-2xl font-bold tracking-tight text-aria-indigo">
            {APP_NAME}
          </h1>
          <p className="text-sm text-aria-stone mt-1.5">
            Connectez-vous à votre compte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">
              Adresse e-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo focus:ring-0 transition-colors"
              placeholder="vous@entreprise.com"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo focus:ring-0 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-xs text-aria-red bg-aria-red/5 border border-aria-red/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* CTA — Terre de Sienne */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-aria-terracotta text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-aria-terracotta-dark transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        {/* Lien retour */}
        <p className="mt-5 text-center text-sm text-aria-stone">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-aria-indigo font-medium hover:underline">
            Créer un compte gratuit
          </Link>
        </p>

        {/* Mention Anthropic — charte §13, Inter Regular 14px, Gris Pierre */}
        <p className="mt-7 text-center text-xs text-aria-stone">
          Powered by Claude · Anthropic
        </p>
      </div>
    </div>
  );
}
