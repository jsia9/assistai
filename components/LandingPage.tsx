"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import DemoChatWidget from "@/components/demo/DemoChatWidget";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "LIYA";

/* Fade-in au scroll via IntersectionObserver */
function useFadeIn() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("is-visible"); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export default function LandingPage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]   = useState({ name: "", company: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const refFeatures  = useFadeIn();
  const refCompare   = useFadeIn();
  const refAudiences = useFadeIn();
  const refPricing   = useFadeIn();

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
    <>
      {/* ── Global fade-in style ───────────────────────────────── */}
      <style>{`
        .fade-section {
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.7s ease, transform 0.7s ease;
        }
        .fade-section.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .feature-card::before {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 4px; height: 0;
          background: #C8543A;
          transition: height 0.3s ease;
          border-radius: 4px 0 0 4px;
        }
        .feature-card:hover::before { height: 100%; }
      `}</style>

      <div className="min-h-screen bg-aria-sand flex flex-col">

        {/* ── Bandeau de confiance (z-20, top fixe) ───────────── */}
        <div className="w-full bg-[#EFE9DD] border-b border-[#C8C2B5] py-2 text-center text-[13px] font-medium text-aria-terracotta tracking-[0.02em] sticky top-0 z-20">
          ✦ Powered by Claude · Anthropic
        </div>

        {/* ── Header ───────────────────────────────────────────── */}
        <header className="sticky top-[33px] z-10 bg-aria-sand/92 backdrop-blur-md border-b border-[#C8C2B5]/40 py-4">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
            {/* Logo */}
            <a href="#" className="relative font-display text-[28px] font-bold text-aria-indigo tracking-[-0.02em]">
              {APP_NAME}
              <span className="absolute bottom-[6px] -right-2 w-[6px] h-[6px] rounded-full bg-aria-terracotta" />
            </a>

            {/* Nav */}
            <ul className="hidden md:flex gap-8 list-none">
              {[
                { label: "Produit",     href: "#features"  },
                { label: "Pour qui",    href: "#audiences" },
                { label: "Tarifs",      href: "#pricing"   },
                { label: "Connexion",   href: "/login"     },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    className="text-[15px] font-medium text-aria-anthracite hover:text-aria-terracotta transition-colors"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <a
              href="#cta-final"
              className="bg-aria-terracotta text-white text-[15px] font-semibold px-5 py-2.5 rounded-lg hover:bg-aria-terracotta-dark transition-all hover:-translate-y-px shadow-sm"
            >
              Essayer gratuitement
            </a>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          {/* Blobs décoratifs */}
          <div
            className="pointer-events-none absolute top-12 -right-32 w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #D9A441 0%, transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-20 w-[400px] h-[400px] rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #1A2A4F 0%, transparent 70%)" }}
          />

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="max-w-[820px]">
              {/* Suptitle */}
              <p className="text-[13px] font-semibold tracking-[0.18em] uppercase text-aria-terracotta mb-6">
                L&apos;INTELLIGENCE ARTIFICIELLE, PENSÉE POUR L&apos;AFRIQUE
              </p>

              {/* H1 */}
              <h1 className="font-display text-[clamp(40px,6vw,68px)] font-bold leading-[1.05] text-aria-indigo tracking-[-0.025em] mb-7">
                La puissance de l&apos;IA,{" "}
                <span className="text-aria-terracotta italic font-semibold">
                  à votre échelle.
                </span>
              </h1>

              {/* Sous-titre */}
              <p className="text-[20px] leading-[1.55] text-aria-anthracite mb-4 max-w-[680px]">
                Du consultant indépendant à la grande entreprise, LIYA s&apos;adapte à vos besoins.
                Rédigez, analysez, traduisez, synthétisez — en français, avec votre contexte africain en bonus.{" "}
                <span className="font-bold text-aria-indigo">
                  Essai gratuit 14 jours, puis à partir de 9 000 FCFA / mois.
                </span>
              </p>

              {/* Boutons */}
              <div className="flex flex-wrap gap-4 mt-9">
                <button
                  onClick={() => document.getElementById("cta-final")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 bg-aria-terracotta text-white font-semibold text-[17px] px-8 py-4 rounded-lg hover:bg-aria-terracotta-dark transition-all hover:-translate-y-px shadow-md"
                >
                  Essayer 5 messages gratuits
                </button>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 border-[1.5px] border-aria-indigo text-aria-indigo font-semibold text-[17px] px-8 py-4 rounded-lg hover:bg-aria-indigo hover:text-white transition-all"
                >
                  Voir les tarifs
                </a>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-6 mt-8 text-[14px] text-aria-stone">
                {["Sans carte bancaire requise", "5 messages gratuits sans inscription", "Powered by Claude (Anthropic)"].map(t => (
                  <span key={t} className="before:content-['✓_'] before:text-aria-terracotta before:font-bold">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section
          id="features"
          ref={refFeatures as React.RefObject<HTMLElement>}
          className="fade-section py-20"
        >
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-aria-terracotta mb-4">
              Trois choses que LIYA fait pour vous
            </p>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold text-aria-indigo tracking-[-0.02em] leading-[1.1] mb-4">
              Une IA puissante. Sans complexité.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
              {[
                { icon: "✏️", title: "Rédiger plus vite, mieux",        text: "Courriers, contrats, rapports, présentations. LIYA produit un premier jet professionnel en quelques secondes que vous affinez ensuite." },
                { icon: "🔍", title: "Analyser vos documents",           text: "Importez un PDF, un Word, un Excel. LIYA en extrait les points clés, repère les incohérences, et répond à vos questions sur le contenu." },
                { icon: "🌍", title: "En français, avec votre contexte", text: "LIYA parle français avec les nuances locales. Elle connaît les institutions, les usages commerciaux et les réalités économiques de votre marché." },
              ].map(({ icon, title, text }) => (
                <div
                  key={title}
                  className="feature-card relative bg-white rounded-2xl p-9 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden"
                >
                  <div className="w-14 h-14 bg-aria-sand rounded-xl flex items-center justify-center text-[28px] mb-5">
                    {icon}
                  </div>
                  <h3 className="font-display text-[22px] font-semibold text-aria-indigo tracking-[-0.01em] mb-3">
                    {title}
                  </h3>
                  <p className="text-aria-stone text-[15px] leading-[1.65]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparatif ───────────────────────────────────────── */}
        <section
          ref={refCompare as React.RefObject<HTMLElement>}
          className="fade-section bg-white py-20"
        >
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-aria-terracotta mb-4">
              Pourquoi pas ChatGPT ?
            </p>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold text-aria-indigo tracking-[-0.02em] leading-[1.1] mb-4">
              La même technologie. Pensée pour vous.
            </h2>
            <p className="text-[18px] text-aria-stone max-w-[660px] mb-8">
              LIYA est propulsée par Claude, le modèle d&apos;Anthropic — la même IA que sur claude.ai, optimisée pour le contexte francophone africain.
            </p>
            <div className="bg-aria-sand rounded-2xl overflow-hidden mt-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="bg-aria-indigo text-white font-semibold text-[15px] px-6 py-[18px] text-left w-1/3"></th>
                    <th className="bg-aria-indigo text-white font-semibold text-[15px] px-6 py-[18px] text-left">ChatGPT, Claude.ai</th>
                    <th className="bg-aria-terracotta text-white font-semibold text-[15px] px-6 py-[18px] text-left">LIYA</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Paiement",          "Carte bancaire en USD",   "FCFA · Mobile money · Cash"],
                    ["Contexte local",    "Générique",               "Comprend l'Afrique francophone"],
                    ["Compte entreprise", "Plans US/EU",             "Multi-utilisateurs avec admin local"],
                    ["Support",           "Email anglais",           "Représentant francophone local"],
                    ["Tarif d'entrée",    "20 USD via Visa étrangère", "9 000 FCFA via Wave / Orange Money"],
                  ].map(([label, chatgpt, liya], i) => (
                    <tr key={label} className={i < 4 ? "border-b border-[#C8C2B5]" : ""}>
                      <td className="font-semibold text-aria-indigo px-6 py-[18px] text-[15px]">{label}</td>
                      <td className="px-6 py-[18px] text-[15px] text-aria-anthracite">{chatgpt}</td>
                      <td className="px-6 py-[18px] text-[15px] font-semibold text-aria-anthracite bg-aria-terracotta/5">{liya}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Pour qui ─────────────────────────────────────────── */}
        <section
          id="audiences"
          ref={refAudiences as React.RefObject<HTMLElement>}
          className="fade-section py-20"
        >
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-aria-terracotta mb-4">
              Pour qui
            </p>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold text-aria-indigo tracking-[-0.02em] leading-[1.1] mb-4">
              Pour tous ceux qui travaillent en Afrique francophone.
            </h2>
            <p className="text-[18px] text-aria-stone mb-14">
              LIYA s&apos;adapte à votre échelle, du seul au millier d&apos;utilisateurs.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  emoji: "👤",
                  title: "Vous, seul·e",
                  text:  "Freelance, consultant, indépendant. Rédigez vos propositions, analysez vos contrats, traduisez vos rapports. Sans abonnement à 20 USD payable en carte étrangère.",
                  price: "À partir de 9 000 FCFA/mois",
                },
                {
                  emoji: "👥",
                  title: "Votre équipe",
                  text:  "PME et équipes. Toute votre équipe sur un même outil. Admin centralisé, projets partagés, contexte métier mémorisé. Paiement entreprise en FCFA.",
                  price: "À partir de 90 000 FCFA/mois",
                },
                {
                  emoji: "🏢",
                  title: "Votre organisation",
                  text:  "Grandes entreprises et institutions. Plans sur mesure au-delà de 20 utilisateurs, support dédié, conformité aux exigences locales. Représentant LIYA dédié.",
                  price: "Sur devis",
                },
              ].map(({ emoji, title, text, price }) => (
                <div
                  key={title}
                  className="bg-white rounded-2xl p-9 border-2 border-transparent hover:border-aria-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
                >
                  <span className="text-[36px] block mb-4">{emoji}</span>
                  <h4 className="font-display text-[22px] font-bold text-aria-indigo mb-3">{title}</h4>
                  <p className="text-aria-stone text-[15px] leading-[1.6] mb-5">{text}</p>
                  <p className="text-[14px] font-semibold text-aria-terracotta font-display">{price}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-[15px] text-aria-stone text-center">
              LIYA est utilisée à travers l&apos;Afrique de l&apos;Ouest francophone par des cabinets juridiques, banques, ONG, agences de communication, cabinets comptables et administrations.{" "}
              <a href="#secteurs" className="text-aria-terracotta font-medium hover:underline">
                Voir les usages spécifiques pour votre secteur →
              </a>
            </p>
          </div>
        </section>

        {/* ── Tarifs ───────────────────────────────────────────── */}
        <section
          id="pricing"
          ref={refPricing as React.RefObject<HTMLElement>}
          className="fade-section bg-[#EFE9DD] py-20"
        >
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-aria-terracotta mb-4">
              Tarifs
            </p>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold text-aria-indigo tracking-[-0.02em] leading-[1.1] mb-4">
              Une tarification claire, en FCFA, pour chaque taille.
            </h2>
            <p className="text-[18px] text-aria-stone max-w-[660px] mb-14">
              Du test gratuit à l&apos;équipe complète — choisissez le palier qui vous correspond aujourd&apos;hui, changez-en quand vous grandissez.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
              {[
                {
                  name: "Test gratuit",
                  target: "14 jours pour découvrir Premium",
                  amount: "0",
                  amountUsd: "sans carte bancaire",
                  features: ["14 jours d'accès Premium", "50 000 tokens facturés", "Tous les modèles dont Opus", "1 utilisateur", "Sans engagement"],
                  cta: "Démarrer le trial",
                  ctaStyle: "secondary",
                  featured: false,
                },
                {
                  name: "Découverte",
                  target: "Pour démarrer en douceur",
                  amount: "9 000",
                  amountUsd: "~$15 / mois",
                  features: ["200 000 tokens facturés", "1 utilisateur", "Sonnet & Haiku", "Projets et documents", "Mobile money"],
                  cta: "Choisir Découverte",
                  ctaStyle: "secondary",
                  featured: false,
                },
                {
                  name: "Premium ✨",
                  target: "Toute la puissance, pour vous",
                  amount: "20 000",
                  amountUsd: "~$33 / mois",
                  features: ["500 000 tokens facturés", "1 utilisateur", "Tous les modèles, dont Opus", "Projets illimités", "Réflexion étendue"],
                  cta: "Choisir Premium",
                  ctaStyle: "primary",
                  featured: true,
                },
                {
                  name: "Business 5",
                  target: "Pour votre petite équipe",
                  amount: "90 000",
                  amountUsd: "~$150 / mois",
                  features: ["1 500 000 tokens facturés", "jusqu'à 5 utilisateurs", "Tous les modèles dont Opus", "Admin équipe", "Tous moyens de paiement"],
                  cta: "Choisir Business 5",
                  ctaStyle: "secondary",
                  featured: false,
                },
                {
                  name: "Business 20",
                  target: "Pour votre cabinet structuré",
                  amount: "200 000",
                  amountUsd: "~$333 / mois",
                  features: ["4 000 000 tokens facturés", "jusqu'à 20 utilisateurs", "Tous les modèles dont Opus", "Admin avancé + audit logs", "Support prioritaire"],
                  cta: "Choisir Business 20",
                  ctaStyle: "secondary",
                  featured: false,
                },
              ].map(({ name, target, amount, amountUsd, features, cta, ctaStyle, featured }) => (
                <div
                  key={name}
                  className={`relative bg-white rounded-2xl p-7 text-center flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    featured
                      ? "border-2 border-aria-terracotta scale-[1.02] shadow-xl hover:-translate-y-1"
                      : "border-2 border-transparent"
                  }`}
                >
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-aria-terracotta text-white text-xs font-semibold px-4 py-1 rounded-full tracking-[0.05em]">
                      Recommandé
                    </span>
                  )}
                  <h4 className="font-display text-[22px] font-bold text-aria-indigo mb-1">{name}</h4>
                  <p className="text-[13px] text-aria-stone italic mb-6">{target}</p>
                  <div className="font-display text-[36px] font-extrabold text-aria-anthracite leading-none mb-1">
                    {amount}
                    <span className="text-[18px] text-aria-stone font-normal"> FCFA</span>
                  </div>
                  <p className="text-[13px] text-aria-stone mb-6">{amountUsd}</p>
                  <ul className="text-left mb-6 pb-6 border-b border-[#C8C2B5] space-y-1.5 flex-1">
                    {features.map(f => (
                      <li key={f} className="text-[14px] text-aria-anthracite">
                        <span className="text-aria-terracotta font-bold mr-2">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`block w-full text-center py-3 rounded-lg text-[15px] font-semibold transition-colors ${
                      ctaStyle === "primary"
                        ? "bg-aria-terracotta text-white hover:bg-aria-terracotta-dark"
                        : "border-[1.5px] border-aria-indigo text-aria-indigo hover:bg-aria-indigo hover:text-white"
                    }`}
                  >
                    {cta}
                  </Link>
                </div>
              ))}
            </div>

            {/* Note */}
            <p className="text-center mt-8 text-[14px] text-aria-stone italic">
              Recharge possible à tout moment : 10 000 FCFA = 200 000 tokens supplémentaires.{" "}
              <a href="#" className="text-aria-terracotta font-semibold hover:underline">Demander un devis sur mesure →</a>
            </p>

            {/* Encart modèles */}
            <div className="mt-10 max-w-[760px] mx-auto bg-white rounded-xl border-l-4 border-aria-terracotta px-8 py-6">
              <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-aria-terracotta mb-3">
                À PROPOS DES MODÈLES
              </p>
              <p className="text-[15px] leading-[1.6] text-aria-anthracite mb-4">
                <strong>Tous les paliers payants donnent accès à tous les modèles</strong> (sauf Découverte qui n&apos;inclut pas Opus).
                Le débit de tokens est pondéré selon le modèle utilisé :
              </p>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { icon: "⚡", name: "Haiku",  coeff: "×0,3 — économique" },
                  { icon: "✦", name: "Sonnet", coeff: "×1 — référence"    },
                  { icon: "◆", name: "Opus",   coeff: "×5 — puissant"     },
                ].map(({ icon, name, coeff }) => (
                  <div key={name} className="bg-aria-sand rounded-lg p-3">
                    <strong className="text-aria-indigo">{icon} {name}</strong><br />
                    <span className="text-[13px] text-aria-stone">{coeff}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Final (bg Indigo sombre + watermark) ─────────── */}
        <section
          id="cta-final"
          className="relative bg-aria-indigo text-white text-center py-24 overflow-hidden"
        >
          {/* Watermark LIYA */}
          <span
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display font-extrabold leading-none select-none"
            style={{ fontSize: "clamp(180px, 30vw, 400px)", color: "rgba(255,255,255,0.04)", letterSpacing: "-0.05em" }}
            aria-hidden
          >
            LIYA
          </span>
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <h2 className="font-display text-[clamp(36px,5vw,56px)] font-bold tracking-[-0.02em] mb-6">
              Essayez LIYA. 5 messages gratuits, sans inscription.
            </h2>
            <p className="text-[19px] opacity-85 mb-9 max-w-[520px] mx-auto">
              Aucune carte bancaire. Aucune installation. Une simple conversation pour comprendre ce que LIYA peut faire pour vous.
            </p>
            <button
              onClick={() => document.querySelector<HTMLButtonElement>("[data-demo-trigger]")?.click()}
              className="inline-flex items-center gap-3 bg-aria-terracotta text-white font-semibold text-[17px] px-10 py-4 rounded-lg hover:bg-aria-ochre hover:text-aria-anthracite transition-all hover:-translate-y-px shadow-md"
            >
              Tester maintenant
            </button>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="bg-aria-anthracite text-aria-sand pt-16 pb-6">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-12">
              {/* Brand */}
              <div>
                <span className="relative font-display text-[32px] font-bold text-aria-sand tracking-[-0.02em]">
                  {APP_NAME}
                  <span className="absolute bottom-[6px] -right-2 w-[6px] h-[6px] rounded-full bg-aria-terracotta" />
                </span>
                <p className="mt-3 text-[14px] text-aria-stone max-w-[280px] mb-6">
                  L&apos;IA puissante et accessible, conçue pour les entreprises africaines.
                </p>
                <a
                  href="https://anthropic.com/claude"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[17px] font-semibold text-aria-terracotta hover:underline"
                >
                  ✦ Powered by Claude · Anthropic
                </a>
              </div>

              {/* Produit */}
              <div>
                <h5 className="text-white text-[13px] font-semibold tracking-[0.1em] uppercase mb-4">Produit</h5>
                <ul className="space-y-2.5">
                  {[
                    { label: "Fonctionnalités", href: "#features"        },
                    { label: "Tarifs",           href: "#pricing"         },
                    { label: "Pour juristes",    href: "/pour-juristes"   },
                    { label: "Pour banques",     href: "/pour-banques"    },
                    { label: "Pour ONG",         href: "/pour-ong"        },
                    { label: "Pour comptables",  href: "/pour-comptables" },
                  ].map(({ label, href }) => (
                    <li key={label}>
                      <a href={href} className="text-[14px] text-aria-stone hover:text-aria-terracotta transition-colors">{label}</a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Entreprise */}
              <div>
                <h5 className="text-white text-[13px] font-semibold tracking-[0.1em] uppercase mb-4">Entreprise</h5>
                <ul className="space-y-2.5">
                  {["À propos", "Contact", "Blog", "Carrières"].map(l => (
                    <li key={l}><a href="#" className="text-[14px] text-aria-stone hover:text-aria-terracotta transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>

              {/* Légal */}
              <div>
                <h5 className="text-white text-[13px] font-semibold tracking-[0.1em] uppercase mb-4">Légal</h5>
                <ul className="space-y-2.5">
                  {["Conditions", "Confidentialité", "Mentions légales"].map(l => (
                    <li key={l}><a href="#" className="text-[14px] text-aria-stone hover:text-aria-terracotta transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 flex flex-wrap justify-between items-center gap-3 text-[13px] text-aria-stone">
              <span>© 2026 SIA Agile Solutions · LIYA</span>
              <span className="text-aria-terracotta font-medium">Powered by Claude · Anthropic</span>
            </div>
          </div>
        </footer>

        {/* ── Modal demande d'accès entreprise ─────────────────── */}
        {showModal && (
          <div
            className="fixed inset-0 bg-aria-anthracite/50 flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-[#E8E2D6]">
              <h2 className="font-display text-xl font-semibold text-aria-indigo mb-5">
                Demander l&apos;accès entreprise
              </h2>
              {status === "done" ? (
                <p className="text-aria-emerald py-4 text-sm font-medium">
                  Demande envoyée. Nous vous contacterons bientôt.
                </p>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  {[
                    { key: "name",    label: "Nom complet",    type: "text",  placeholder: "Jean Koné"              },
                    { key: "company", label: "Entreprise",      type: "text",  placeholder: "SIA Agile Solutions"    },
                    { key: "email",   label: "Adresse e-mail",  type: "email", placeholder: "vous@entreprise.com"    },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">{label}</label>
                      <input
                        required type={type} value={form[key as keyof typeof form]} placeholder={placeholder}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo transition-colors"
                      />
                    </div>
                  ))}
                  {status === "error" && (
                    <p className="text-aria-red text-xs bg-aria-red/5 border border-aria-red/20 rounded-lg px-3 py-2">
                      Erreur d&apos;envoi. Veuillez réessayer.
                    </p>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="flex-1 border border-aria-indigo text-aria-indigo rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-aria-indigo-light transition-colors">
                      Annuler
                    </button>
                    <button type="submit" disabled={status === "loading"}
                      className="flex-1 bg-aria-terracotta text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-aria-terracotta-dark transition-colors disabled:opacity-50">
                      {status === "loading" ? "…" : "Envoyer la demande"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ── Demo widget flottant ──────────────────────────────── */}
        <DemoChatWidget />
      </div>
    </>
  );
}
