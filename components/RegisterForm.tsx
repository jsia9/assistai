"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "LIYA";

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim() || name.trim().length < 2 || name.trim().length > 120) {
      errors.name = "Le nom doit comporter entre 2 et 120 caractères.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Adresse e-mail invalide.";
    }
    if (password.length < 8) {
      errors.password = "Le mot de passe doit comporter au moins 8 caractères.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, company: company || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erreur inconnue." }));
        setServerError(data.error ?? "Erreur lors de la création du compte.");
        return;
      }

      setSuccess(true);

      // Auto-login
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        // Registration succeeded but auto-login failed — send to login page
        router.push("/login");
        return;
      }

      router.push("/chat");
    } catch {
      setServerError("Erreur réseau. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-aria-sand flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-sm border border-[#E8E2D6] p-8">

        {/* Wordmark */}
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold tracking-tight text-aria-indigo">
            {APP_NAME}
          </h1>
          <p className="text-sm text-aria-stone mt-1.5">
            Créez votre compte gratuitement
          </p>
        </div>

        {/* Trial callout */}
        <div className="mb-6 bg-aria-sand border border-[#C8C2B5] rounded-lg px-4 py-3 text-sm text-aria-anthracite text-center">
          ✅ Essai 72h gratuit · Haiku &amp; Sonnet · Sans carte bancaire
        </div>

        {success && (
          <p className="mb-4 text-xs text-aria-emerald bg-aria-emerald/5 border border-aria-emerald/20 rounded-lg px-3 py-2 text-center">
            Compte créé ! Connexion en cours…
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">
              Nom complet <span className="text-aria-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo focus:ring-0 transition-colors"
              placeholder="Jean Koné"
              disabled={loading}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-aria-red">{fieldErrors.name}</p>
            )}
          </div>

          {/* Company (optional) */}
          <div>
            <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">
              Entreprise <span className="text-aria-stone font-normal normal-case">(optionnel)</span>
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo focus:ring-0 transition-colors"
              placeholder="SIA Agile Solutions"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">
              Adresse e-mail <span className="text-aria-terracotta">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo focus:ring-0 transition-colors"
              placeholder="vous@entreprise.com"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-aria-red">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">
              Mot de passe <span className="text-aria-terracotta">*</span>
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo focus:ring-0 transition-colors"
              placeholder="••••••••"
              disabled={loading}
            />
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-aria-red">{fieldErrors.password}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">
              Confirmer le mot de passe <span className="text-aria-terracotta">*</span>
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo focus:ring-0 transition-colors"
              placeholder="••••••••"
              disabled={loading}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-aria-red">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <p className="text-xs text-aria-red bg-aria-red/5 border border-aria-red/20 rounded-lg px-3 py-2">
              {serverError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-aria-terracotta text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-aria-terracotta-dark transition-colors disabled:opacity-50 mt-1"
          >
            {loading ? "Création du compte…" : "Créer mon compte gratuit"}
          </button>
        </form>

        {/* Link to login */}
        <p className="mt-5 text-center text-sm text-aria-stone">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-aria-indigo font-medium hover:underline">
            Se connecter
          </Link>
        </p>

        {/* Mention Anthropic */}
        <p className="mt-7 text-center text-xs text-aria-stone">
          Powered by Claude · Anthropic
        </p>
      </div>
    </div>
  );
}
