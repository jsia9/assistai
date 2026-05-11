import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LIYA pour banques — L'IA pour la conformité et l'analyse financière UEMOA",
  description:
    "Analyses de crédit, conformité BCEAO, rapports réglementaires. L'IA pour les banques et institutions financières d'Afrique de l'Ouest. À partir de 9 000 FCFA/mois.",
};

export default function PourBanquesPage() {
  return (
    <div className="min-h-screen bg-aria-sand">
      {/* Trust banner */}
      <div className="bg-[#EFE9DD] text-aria-terracotta text-[13px] font-medium text-center py-2 border-b border-[#C8C2B5]">
        ✦ Powered by Claude · Anthropic
      </div>

      {/* Sticky header */}
      <header className="sticky top-8 z-10 flex items-center justify-between px-6 py-3 border-b border-[#E8E2D6] bg-aria-sand/90 backdrop-blur-sm">
        <Link href="/" className="relative font-display text-2xl font-bold tracking-tight text-aria-indigo">
          LIYA
          <span className="absolute bottom-1 -right-2 w-1.5 h-1.5 rounded-full bg-aria-terracotta" />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-aria-stone hover:text-aria-anthracite transition-colors"
          >
            ← Retour à LIYA
          </Link>
        </nav>

        <Link
          href="/login"
          className="text-sm font-semibold bg-aria-terracotta text-white px-4 py-1.5 rounded-lg hover:bg-aria-terracotta-dark transition-colors shadow-sm"
        >
          Essayer gratuitement
        </Link>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden flex flex-col items-center justify-center px-6 text-center py-24 md:py-32">
        <div
          className="pointer-events-none absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #D9A441 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, #1A2A4F 0%, transparent 70%)" }}
        />

        <p className="relative text-[13px] font-semibold uppercase tracking-widest text-aria-terracotta mb-5">
          POUR LES BANQUES, MICROFINANCES ET INSTITUTIONS FINANCIÈRES
        </p>

        <h1
          className="relative font-display font-bold text-aria-indigo max-w-3xl leading-tight tracking-tight"
          style={{ fontSize: "clamp(2.5rem, 6vw, 4.25rem)" }}
        >
          L&apos;IA pour la conformité et l&apos;analyse financière UEMOA.
        </h1>

        <p className="relative mt-6 text-lg md:text-xl text-aria-anthracite max-w-2xl leading-relaxed">
          Analyses de crédit, rapports réglementaires BCEAO, notes de conformité. LIYA accélère votre
          production documentaire en respectant les standards prudentiels de l&apos;UEMOA — en français.
          Essai gratuit 14 jours, puis à partir de 9 000 FCFA par mois.
        </p>

        <div className="relative mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="bg-aria-terracotta text-white px-7 py-3 rounded-lg text-base font-semibold hover:bg-aria-terracotta-dark transition-colors shadow-sm"
          >
            Essayer 5 messages gratuits
          </Link>
          <a
            href="#usages"
            className="border border-aria-indigo text-aria-indigo px-7 py-3 rounded-lg text-base font-semibold hover:bg-aria-indigo-light transition-colors"
          >
            Voir les cas d&apos;usage
          </a>
        </div>

        <p className="relative mt-5 text-sm text-aria-stone">
          ✓ Connaît les normes BCEAO/UEMOA &nbsp;·&nbsp; ✓ Analyse Excel et PDF &nbsp;·&nbsp; ✓ Powered by Claude
        </p>
      </section>

      {/* Ce que LIYA fait */}
      <section id="features" className="px-6 py-20 max-w-6xl mx-auto w-full">
        <p className="text-[13px] font-semibold uppercase tracking-widest text-aria-terracotta mb-3 text-center">
          CE QUE LIYA FAIT POUR LES BANQUES
        </p>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-aria-indigo text-center mb-12">
          Trois capacités, immédiatement utiles.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "📋",
              title: "Analyses de crédit et notation",
              text: "LIYA synthétise vos dossiers de crédit, génère des analyses de risque structurées selon vos grilles internes, et prépare vos notes de présentation en comité.",
            },
            {
              icon: "🏛️",
              title: "Conformité réglementaire BCEAO",
              text: "Rapports prudentiels, notes de conformité, analyses de ratios réglementaires. LIYA connaît les instructions et circulaires BCEAO.",
            },
            {
              icon: "📊",
              title: "Production documentaire bancaire",
              text: "Mémorandums d'information, rapports annuels, notes à la direction. LIYA structure vos documents selon les standards du secteur.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-2xl shadow-sm border-l-4 border-aria-terracotta p-6 hover:-translate-y-1 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-4">{card.icon}</div>
              <h3 className="font-display text-xl font-bold text-aria-indigo mb-2">{card.title}</h3>
              <p className="text-aria-stone text-sm leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cas d'usage */}
      <section id="usages" className="bg-white py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-aria-terracotta mb-3 text-center">
            CAS D&apos;USAGE
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-aria-indigo text-center mb-12">
            Ce que font vos équipes avec LIYA.
          </h2>

          <div className="space-y-8">
            {[
              {
                n: "1",
                title: "Analyse de dossier de crédit PME",
                before: "4h par dossier en moyenne pour les chargés de clientèle.",
                after:
                  "Chargez les états financiers et les documents → analyse structurée avec ratios, points d'attention, recommandation. Gain : ~3h par dossier.",
                prompt: null,
              },
              {
                n: "2",
                title: "Note de conformité réglementaire",
                before: "Analyse manuelle d'une nouvelle circulaire BCEAO, rédaction de la note interne.",
                after:
                  "LIYA analyse la circulaire et produit une note interne de synthèse avec les impacts sur vos procédures.",
                prompt: null,
              },
              {
                n: "3",
                title: "Rapport de comité de crédit",
                before: "Rédaction laborieuse de la note de présentation à partir des données brutes.",
                after:
                  "À partir de vos données et analyses, LIYA rédige la note de présentation au comité selon votre format standard.",
                prompt: null,
              },
              {
                n: "4",
                title: "Formation des équipes",
                before: "Formation longue, support externe coûteux pour chaque nouvelle réglementation.",
                after:
                  "LIYA explique les nouvelles réglementations, prépare des QCM de formation, et répond aux questions de vos équipes.",
                prompt: null,
              },
            ].map((uc) => (
              <div key={uc.n} className="flex gap-5">
                <div className="w-10 h-10 rounded-full bg-aria-indigo flex items-center justify-center text-white font-display text-lg font-bold flex-shrink-0 mt-1">
                  {uc.n}
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-lg font-bold text-aria-indigo mb-2">{uc.title}</h3>
                  <p className="text-sm text-aria-stone mb-1">
                    <span className="font-semibold text-aria-anthracite">Avant :</span> {uc.before}
                  </p>
                  <p className="text-sm text-aria-stone mb-3">
                    <span className="font-semibold text-aria-terracotta">Avec LIYA :</span> {uc.after}
                  </p>
                  {uc.prompt && (
                    <div className="bg-aria-sand rounded-xl p-4 border border-[#E8E2D6]">
                      <p className="text-xs font-semibold uppercase tracking-widest text-aria-stone mb-2">
                        Exemple de prompt
                      </p>
                      <p className="text-sm text-aria-anthracite italic">&ldquo;{uc.prompt}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="bg-aria-sand py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-aria-terracotta mb-3 text-center">
            POURQUOI LIYA PLUTÔT QUE CHATGPT ?
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-aria-indigo text-center mb-10">
            Une vraie alternative, pas une copie.
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-[#E8E2D6]">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left px-5 py-3.5 font-semibold text-aria-stone bg-white border-b border-[#E8E2D6]">
                    Critère
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-white bg-aria-indigo border-b border-[#E8E2D6] text-center">
                    ChatGPT · Claude.ai
                  </th>
                  <th className="px-5 py-3.5 font-semibold text-white bg-aria-terracotta border-b border-[#E8E2D6] text-center">
                    LIYA
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Réglementation BCEAO", "Connaissances générales", "Instructions et circulaires BCEAO intégrées"],
                  ["Normes prudentielles", "Génériques (Bâle)", "Adaptées au contexte UEMOA"],
                  ["Paiement", "Carte bancaire USD", "FCFA, mobile money, cash"],
                  ["Gestion multi-utilisateurs", "Plans US/EU", "Admin local + gestion d'équipes"],
                  ["Confidentialité données client", "Usage hors zone", "Pas d'entraînement, audit logs"],
                ].map(([crit, other, liya], i) => (
                  <tr key={crit} className={i % 2 === 0 ? "bg-white" : "bg-aria-sand/40"}>
                    <td className="px-5 py-3.5 font-medium text-aria-anthracite border-b border-[#E8E2D6]">{crit}</td>
                    <td className="px-5 py-3.5 text-aria-stone text-center border-b border-[#E8E2D6]">{other}</td>
                    <td className="px-5 py-3.5 text-aria-terracotta font-semibold text-center border-b border-[#E8E2D6] bg-[#FDF4F2]">
                      {liya}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="tarifs" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-aria-indigo text-center mb-3">
            Tarifs clairs, en FCFA.
          </h2>
          <p className="text-center text-aria-stone text-lg mb-12">
            Du test individuel au déploiement équipe — choisissez le palier qui vous correspond.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-6 flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-widest text-aria-stone mb-4">Test gratuit</p>
              <p className="font-display text-3xl font-bold text-aria-indigo mb-1">0 FCFA</p>
              <p className="text-sm text-aria-stone mb-1">14 jours</p>
              <p className="text-xs italic text-aria-stone mb-5">Découvrez Premium pendant 14 jours</p>
              <ul className="space-y-2 text-sm text-aria-anthracite mb-6 flex-1">
                <li>✓ 50 000 tokens</li>
                <li>✓ 1 utilisateur</li>
                <li>✓ Tous modèles</li>
              </ul>
              <Link
                href="/login"
                className="w-full border border-aria-indigo text-aria-indigo rounded-lg py-2.5 text-sm font-semibold hover:bg-aria-indigo-light transition-colors text-center"
              >
                Démarrer gratuitement
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-6 flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-widest text-aria-stone mb-4">Découverte</p>
              <p className="font-display text-3xl font-bold text-aria-indigo mb-1">9 000 FCFA</p>
              <p className="text-sm text-aria-stone mb-1">par mois <span className="text-xs">(~$15)</span></p>
              <p className="text-xs italic text-aria-stone mb-5">Pour un collaborateur</p>
              <ul className="space-y-2 text-sm text-aria-anthracite mb-6 flex-1">
                <li>✓ 200 000 tokens</li>
                <li>✓ 1 utilisateur</li>
                <li>✓ Sonnet &amp; Haiku</li>
              </ul>
              <Link
                href="/login"
                className="w-full border border-aria-indigo text-aria-indigo rounded-lg py-2.5 text-sm font-semibold hover:bg-aria-indigo-light transition-colors text-center"
              >
                Choisir Découverte
              </Link>
            </div>

            <div className="bg-white rounded-2xl border-2 border-aria-terracotta p-6 flex flex-col relative shadow-md">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-aria-terracotta text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                ✨ Recommandé
              </span>
              <p className="text-xs font-semibold uppercase tracking-widest text-aria-terracotta mb-4">Premium</p>
              <p className="font-display text-3xl font-bold text-aria-indigo mb-1">20 000 FCFA</p>
              <p className="text-sm text-aria-stone mb-1">par mois <span className="text-xs">(~$33)</span></p>
              <p className="text-xs italic text-aria-stone mb-5">Toute la puissance, pour vous</p>
              <ul className="space-y-2 text-sm text-aria-anthracite mb-6 flex-1">
                <li>✓ 500 000 tokens</li>
                <li>✓ 1 utilisateur</li>
                <li>✓ Tous modèles inc. Opus</li>
              </ul>
              <Link
                href="/login"
                className="w-full bg-aria-terracotta text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-aria-terracotta-dark transition-colors text-center"
              >
                Choisir Premium
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-6 flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-widest text-aria-stone mb-4">Business 5</p>
              <p className="font-display text-3xl font-bold text-aria-indigo mb-1">90 000 FCFA</p>
              <p className="text-sm text-aria-stone mb-1">par mois <span className="text-xs">(~$150)</span></p>
              <p className="text-xs italic text-aria-stone mb-5">Pour une équipe métier</p>
              <ul className="space-y-2 text-sm text-aria-anthracite mb-6 flex-1">
                <li>✓ 1 500 000 tokens</li>
                <li>✓ 5 utilisateurs</li>
                <li>✓ Tous modèles</li>
                <li>✓ Admin équipe</li>
              </ul>
              <Link
                href="/login"
                className="w-full border border-aria-indigo text-aria-indigo rounded-lg py-2.5 text-sm font-semibold hover:bg-aria-indigo-light transition-colors text-center"
              >
                Contacter
              </Link>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D6] p-6 flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-widest text-aria-stone mb-4">Business 20</p>
              <p className="font-display text-3xl font-bold text-aria-indigo mb-1">200 000 FCFA</p>
              <p className="text-sm text-aria-stone mb-1">par mois <span className="text-xs">(~$333)</span></p>
              <p className="text-xs italic text-aria-stone mb-5">Pour votre département</p>
              <ul className="space-y-2 text-sm text-aria-anthracite mb-6 flex-1">
                <li>✓ 4 000 000 tokens</li>
                <li>✓ 20 utilisateurs</li>
                <li>✓ Tous modèles</li>
                <li>✓ Admin avancé + audit logs</li>
              </ul>
              <Link
                href="/login"
                className="w-full border border-aria-indigo text-aria-indigo rounded-lg py-2.5 text-sm font-semibold hover:bg-aria-indigo-light transition-colors text-center"
              >
                Contacter
              </Link>
            </div>
          </div>

          <p className="mt-6 text-sm text-aria-stone text-center">
            Plus de 20 utilisateurs ou besoin d&apos;une intégration sur mesure ?{" "}
            <Link href="/login" className="text-aria-terracotta hover:underline font-medium">
              Demandez un devis entreprise →
            </Link>
          </p>

          <div className="mt-6 bg-aria-indigo-light rounded-xl px-6 py-4 max-w-2xl mx-auto text-sm text-aria-indigo text-center">
            <span className="font-semibold">À propos des modèles —</span>{" "}
            Haiku ×0,3 (économique) · Sonnet ×1 (référence) · Opus ×5 (puissant)
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 px-6 bg-aria-sand">
        <div className="max-w-4xl mx-auto">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-aria-terracotta mb-3 text-center">
            SÉCURITÉ
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-aria-indigo text-center mb-12">
            Confidentialité des données bancaires.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {[
              {
                icon: "🔒",
                title: "Données client protégées",
                text: "Vos données de clients et dossiers de crédit ne sont pas utilisés pour entraîner Claude.",
              },
              {
                icon: "🏛️",
                title: "Conformité réglementaire",
                text: "Infrastructure hébergée en Europe, conforme aux exigences de confidentialité du secteur bancaire.",
              },
              {
                icon: "📋",
                title: "Audit logs disponibles",
                text: "Traçabilité complète des accès et actions pour les plans Business 20 — conformité interne facilitée.",
              },
              {
                icon: "🛡️",
                title: "Powered by Claude (Anthropic)",
                text: "Le modèle le plus avancé et le plus sécurisé du marché, utilisé par les plus grandes institutions mondiales.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="text-3xl flex-shrink-0">{item.icon}</div>
                <div>
                  <h3 className="font-display text-base font-bold text-aria-indigo mb-1">{item.title}</h3>
                  <p className="text-sm text-aria-stone">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[13px] font-semibold uppercase tracking-widest text-aria-terracotta mb-3">
            TÉMOIGNAGES
          </p>
          <h2 className="font-display text-3xl font-bold text-aria-indigo mb-10">
            Ce que disent les équipes bancaires.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-aria-sand rounded-2xl border border-[#E8E2D6] p-6 text-left"
              >
                <p className="text-aria-stone italic text-sm">(témoignage à venir)</p>
                <p className="mt-4 text-xs font-semibold text-aria-stone uppercase tracking-widest">
                  — Banque commerciale, Abidjan
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-aria-sand flex flex-col items-center text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-aria-indigo mb-4 max-w-xl">
          Essayez LIYA. 5 messages gratuits, sans inscription.
        </h2>
        <p className="text-aria-stone mb-8 max-w-lg">
          Analysez un dossier de crédit ou rédigez une note de conformité BCEAO — maintenant, gratuitement.
        </p>
        <Link
          href="/login"
          className="bg-aria-terracotta text-white px-10 py-4 rounded-lg text-lg font-semibold hover:bg-aria-terracotta-dark transition-colors shadow-sm"
        >
          Essayer gratuitement
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E8E2D6] bg-aria-indigo text-white px-6 pt-10 pb-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight">
            LIYA<span className="text-aria-terracotta">.</span>
          </Link>
          <a
            href="https://anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-aria-terracotta hover:underline"
          >
            Powered by Claude · Anthropic
          </a>
          <p className="text-xs text-white/40">© 2026 SIA Agile Solutions · LIYA</p>
        </div>
      </footer>
    </div>
  );
}
