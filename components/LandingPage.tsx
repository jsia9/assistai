"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Locale } from "@/i18n";

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

// ── Locale-aware content ─────────────────────────────────────────────────────

const LANG_FLAGS: Record<Locale, string> = { fr: "🇫🇷", en: "🇬🇧", ar: "🇲🇦" };
const LANG_LABELS: Record<Locale, string> = { fr: "FR", en: "EN", ar: "AR" };

type PricingTier = {
  name: string;
  target: string;
  amount: string;
  amountSub: string;
  features: string[];
  cta: string;
  ctaStyle: "primary" | "secondary";
  featured: boolean;
};

type LocaleContent = {
  dir: "ltr" | "rtl";
  supertitle: string;
  h1a: string;
  h1b: string;
  subtitle: string;
  heroStarterPrice: string;
  ctaTry: string;
  ctaPricing: string;
  trustBadges: string[];
  featuresLabel: string;
  featuresH2: string;
  featureCards: { icon: string; title: string; text: string }[];
  compareLabel: string;
  compareH2: string;
  compareSubtitle: string;
  compareRows: [string, string, string][];
  audiencesLabel: string;
  audiencesH2: string;
  audiencesSub: string;
  audienceCards: { emoji: string; title: string; text: string; price: string }[];
  audiencesFooter: string;
  pricingLabel: string;
  pricingH2: string;
  pricingSub: string;
  currencyLabel: string;
  pricingTiers: PricingTier[];
  topUpNote: string;
  modelsLabel: string;
  modelsH: string;
  modelsList: { icon: string; name: string; coeff: string }[];
  ctaFinalH2: string;
  ctaFinalSub: string;
  ctaFinalBtn: string;
  footerTagline: string;
  footerProdLabel: string;
  footerProdLinks: { label: string; href: string }[];
  footerCompanyLabel: string;
  footerCompanyLinks: string[];
  footerLegalLabel: string;
  footerLegalLinks: string[];
  navLinks: { label: string; href: string }[];
  navCta: string;
};

const CONTENT: Record<Locale, LocaleContent> = {
  fr: {
    dir: "ltr",
    supertitle: "L'INTELLIGENCE ARTIFICIELLE, PENSÉE POUR L'AFRIQUE",
    h1a: "La puissance de l'IA,",
    h1b: "à votre échelle.",
    subtitle: "Du consultant indépendant à la grande entreprise, LIYA s'adapte à vos besoins. Rédigez, analysez, traduisez, synthétisez — en français, avec votre contexte africain en bonus.",
    heroStarterPrice: "Essai gratuit 72h, puis à partir de 9 000 FCFA / mois.",
    ctaTry: "Démarrer l'essai gratuit",
    ctaPricing: "Voir les tarifs",
    trustBadges: ["Avec ou sans carte bancaire", "Essai gratuit 72h sans engagement", "Powered by Claude (Anthropic)"],
    featuresLabel: "Trois choses que LIYA fait pour vous",
    featuresH2: "Une IA puissante. Sans complexité.",
    featureCards: [
      { icon: "✏️", title: "Rédiger plus vite, mieux",        text: "Courriers, contrats, rapports, présentations. LIYA produit un premier jet professionnel en quelques secondes que vous affinez ensuite." },
      { icon: "🔍", title: "Analyser vos documents",           text: "Importez un PDF, un Word, un Excel. LIYA en extrait les points clés, repère les incohérences, et répond à vos questions sur le contenu." },
      { icon: "🌍", title: "En français, avec votre contexte", text: "LIYA parle français avec les nuances locales. Elle connaît les institutions, les usages commerciaux et les réalités économiques de votre marché." },
    ],
    compareLabel: "Pourquoi pas ChatGPT ?",
    compareH2: "La même technologie. Pensée pour vous.",
    compareSubtitle: "LIYA est propulsée par Claude, le modèle d'Anthropic — la même IA que sur claude.ai, optimisée pour le contexte francophone africain.",
    compareRows: [
      ["Paiement",          "Carte bancaire en USD",               "FCFA · Mobile money · Cash"],
      ["Contexte local",    "Générique",                           "Comprend l'Afrique francophone"],
      ["Compte entreprise", "Plans US/EU",                         "Multi-utilisateurs avec admin local"],
      ["Support",           "Email anglais",                       "Représentant francophone local"],
      ["Tarif d'entrée",    "20 USD · carte étrangère requise",    "Essai 72h gratuit · puis 9 000 FCFA"],
    ],
    audiencesLabel: "Pour qui",
    audiencesH2: "Pour tous ceux qui travaillent en Afrique francophone.",
    audiencesSub: "LIYA s'adapte à votre échelle, du seul au millier d'utilisateurs.",
    audienceCards: [
      {
        emoji: "👤",
        title: "Vous, seul·e",
        text: "Freelance, consultant, cadre de tout domaine. Rédigez vos propositions, analysez vos contrats, traduisez vos rapports. Avec ou sans carte bancaire.",
        price: "Essai 72h gratuit · puis 9 000 FCFA/mois",
      },
      {
        emoji: "👥",
        title: "Votre équipe",
        text: "PME et équipes. Toute votre équipe sur un même outil. Admin centralisé, projets partagés, contexte métier mémorisé. Paiement entreprise en FCFA.",
        price: "À partir de 90 000 FCFA/mois",
      },
      {
        emoji: "🏢",
        title: "Votre organisation",
        text: "Grandes entreprises et institutions. Plans sur mesure au-delà de 20 utilisateurs, support dédié, conformité aux exigences locales. Représentant LIYA dédié.",
        price: "Sur devis",
      },
    ],
    audiencesFooter: "LIYA est utilisée à travers l'Afrique de l'Ouest francophone par des cabinets juridiques, banques, ONG, agences de communication, cabinets comptables et administrations.",
    pricingLabel: "Tarifs",
    pricingH2: "Une tarification claire, en FCFA, pour chaque étape.",
    pricingSub: "Démarrez gratuitement, découvrez sans engagement, montez en puissance quand vous êtes prêt.",
    currencyLabel: "FCFA",
    pricingTiers: [
      {
        name: "Essai gratuit",
        target: "72h pour découvrir LIYA",
        amount: "0",
        amountSub: "72h · Haiku & Sonnet",
        features: [
          "72h d'accès complet",
          "Haiku & Sonnet inclus",
          "Projets et documents",
          "1 utilisateur",
          "Sans engagement",
        ],
        cta: "Démarrer l'essai",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "Découverte",
        target: "Le vrai aperçu du premium",
        amount: "9 000",
        amountSub: "Opus inclus · max 3 mois",
        features: [
          "200 000 tokens / mois",
          "1 utilisateur",
          "Haiku, Sonnet & Opus ✓",
          "Projets et documents",
          "Réflexion approfondie non incluse",
        ],
        cta: "Choisir Découverte",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "Premium ✨",
        target: "Toute la puissance, pour vous",
        amount: "20 000",
        amountSub: "Opus + réflexion · ~$33/mois",
        features: [
          "500 000 tokens / mois",
          "1 utilisateur",
          "Haiku, Sonnet & Opus ✓",
          "Réflexion approfondie ✓",
          "Projets illimités",
        ],
        cta: "Choisir Premium",
        ctaStyle: "primary",
        featured: true,
      },
      {
        name: "Business 5",
        target: "Pour votre petite équipe",
        amount: "90 000",
        amountSub: "5 users · ~$150/mois",
        features: [
          "1 500 000 tokens / mois",
          "Jusqu'à 5 utilisateurs",
          "Tous les modèles dont Opus",
          "Réflexion approfondie ✓",
          "Admin équipe",
        ],
        cta: "Choisir Business 5",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "Business 20",
        target: "Pour votre cabinet structuré",
        amount: "200 000",
        amountSub: "20 users · ~$333/mois",
        features: [
          "4 000 000 tokens / mois",
          "Jusqu'à 20 utilisateurs",
          "Tous les modèles dont Opus",
          "Admin avancé + audit logs",
          "Support prioritaire",
        ],
        cta: "Choisir Business 20",
        ctaStyle: "secondary",
        featured: false,
      },
    ],
    topUpNote: "Recharge possible à tout moment : 10 000 FCFA = 200 000 tokens supplémentaires.",
    modelsLabel: "À PROPOS DES MODÈLES",
    modelsH: "Tous les paliers payants (sauf Découverte) incluent la réflexion approfondie. Le débit de tokens est pondéré selon le modèle utilisé :",
    modelsList: [
      { icon: "⚡", name: "Haiku",  coeff: "×0,3 — économique" },
      { icon: "✦", name: "Sonnet", coeff: "×1 — référence"    },
      { icon: "◆", name: "Opus",   coeff: "×5 — puissant"     },
    ],
    ctaFinalH2: "Essayez LIYA. 72h gratuites, sans engagement.",
    ctaFinalSub: "Avec ou sans carte bancaire. Aucune installation. Démarrez en moins d'une minute.",
    ctaFinalBtn: "Démarrer l'essai gratuit",
    footerTagline: "L'IA puissante et accessible, conçue pour les entreprises africaines.",
    footerProdLabel: "Produit",
    footerProdLinks: [
      { label: "Fonctionnalités", href: "#features"        },
      { label: "Tarifs",          href: "#pricing"         },
      { label: "Pour juristes",   href: "/pour-juristes"   },
      { label: "Pour banques",    href: "/pour-banques"    },
      { label: "Pour ONG",        href: "/pour-ong"        },
      { label: "Pour comptables", href: "/pour-comptables" },
    ],
    footerCompanyLabel: "Entreprise",
    footerCompanyLinks: ["À propos", "Contact", "Blog", "Carrières"],
    footerLegalLabel: "Légal",
    footerLegalLinks: ["Conditions", "Confidentialité", "Mentions légales"],
    navLinks: [
      { label: "Produit",   href: "#features"  },
      { label: "Pour qui",  href: "#audiences" },
      { label: "Tarifs",    href: "#pricing"   },
      { label: "Connexion", href: "/login"     },
    ],
    navCta: "Essai gratuit 72h",
  },

  en: {
    dir: "ltr",
    supertitle: "ARTIFICIAL INTELLIGENCE, BUILT FOR AFRICA",
    h1a: "The power of AI,",
    h1b: "at your scale.",
    subtitle: "From independent consultants to large enterprises, LIYA adapts to your needs. Write, analyze, translate, summarize — in your language, with your African context built in.",
    heroStarterPrice: "72-hour free trial, then from $15 / month.",
    ctaTry: "Start free trial",
    ctaPricing: "See pricing",
    trustBadges: ["With or without credit card", "72h free trial, no commitment", "Powered by Claude (Anthropic)"],
    featuresLabel: "Three things LIYA does for you",
    featuresH2: "Powerful AI. No complexity.",
    featureCards: [
      { icon: "✏️", title: "Write faster, better",          text: "Letters, contracts, reports, presentations. LIYA produces a professional first draft in seconds, ready for you to refine." },
      { icon: "🔍", title: "Analyze your documents",         text: "Upload a PDF, Word doc, or spreadsheet. LIYA extracts the key points, spots inconsistencies, and answers your questions about the content." },
      { icon: "🌍", title: "In your language, your context", text: "LIYA speaks your language with local nuances. It understands the institutions, business practices, and economic realities of your market." },
    ],
    compareLabel: "Why not ChatGPT?",
    compareH2: "Same technology. Built for you.",
    compareSubtitle: "LIYA is powered by Claude, Anthropic's model — the same AI as on claude.ai, optimized for the African context.",
    compareRows: [
      ["Payment",          "Credit card in USD",                  "USD · Mobile money · Bank transfer"],
      ["Local context",    "Generic",                             "Understands African business context"],
      ["Team accounts",    "US/EU plans",                         "Multi-user with local admin"],
      ["Support",          "English email",                       "Local representative"],
      ["Entry price",      "$20 · foreign credit card required",  "72h free trial · then $15/month"],
    ],
    audiencesLabel: "Who it's for",
    audiencesH2: "For everyone working in Africa.",
    audiencesSub: "LIYA scales with you, from one to thousands of users.",
    audienceCards: [
      {
        emoji: "👤",
        title: "Just you",
        text: "Freelancer, consultant, executive in any field. Write proposals, analyze contracts, translate reports — with or without a credit card.",
        price: "72h free trial · then $15/month",
      },
      {
        emoji: "👥",
        title: "Your team",
        text: "SMEs and teams. Your whole team on one tool. Centralized admin, shared projects, business context remembered. Team payment in local currency.",
        price: "From $150/month",
      },
      {
        emoji: "🏢",
        title: "Your organization",
        text: "Large enterprises and institutions. Custom plans beyond 20 users, dedicated support, compliance with local requirements. Dedicated LIYA representative.",
        price: "Custom quote",
      },
    ],
    audiencesFooter: "LIYA is used across Africa by law firms, banks, NGOs, communication agencies, accounting firms, and public institutions.",
    pricingLabel: "Pricing",
    pricingH2: "Clear pricing in USD for every stage.",
    pricingSub: "Start free, discover without commitment, scale up when you're ready.",
    currencyLabel: "USD",
    pricingTiers: [
      {
        name: "Free trial",
        target: "72h to discover LIYA",
        amount: "0",
        amountSub: "72h · Haiku & Sonnet",
        features: [
          "72h full access",
          "Haiku & Sonnet included",
          "Projects & documents",
          "1 user",
          "No commitment",
        ],
        cta: "Start free trial",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "Discovery",
        target: "A real taste of Premium",
        amount: "15",
        amountSub: "Opus included · max 3 months",
        features: [
          "200,000 tokens / month",
          "1 user",
          "Haiku, Sonnet & Opus ✓",
          "Projects & documents",
          "Extended thinking not included",
        ],
        cta: "Choose Discovery",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "Premium ✨",
        target: "Full power, for you",
        amount: "33",
        amountSub: "Opus + thinking · ~90,000 FCFA",
        features: [
          "500,000 tokens / month",
          "1 user",
          "Haiku, Sonnet & Opus ✓",
          "Extended thinking ✓",
          "Unlimited projects",
        ],
        cta: "Choose Premium",
        ctaStyle: "primary",
        featured: true,
      },
      {
        name: "Business 5",
        target: "For your small team",
        amount: "150",
        amountSub: "5 users · ~90,000 FCFA",
        features: [
          "1,500,000 tokens / month",
          "Up to 5 users",
          "All models including Opus",
          "Extended thinking ✓",
          "Team admin",
        ],
        cta: "Choose Business 5",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "Business 20",
        target: "For your structured firm",
        amount: "333",
        amountSub: "20 users · ~200,000 FCFA",
        features: [
          "4,000,000 tokens / month",
          "Up to 20 users",
          "All models including Opus",
          "Advanced admin + audit logs",
          "Priority support",
        ],
        cta: "Choose Business 20",
        ctaStyle: "secondary",
        featured: false,
      },
    ],
    topUpNote: "Top up at any time: $17 = 200,000 additional tokens.",
    modelsLabel: "ABOUT MODELS",
    modelsH: "All paid plans (except Discovery) include extended thinking. Token consumption is weighted by model:",
    modelsList: [
      { icon: "⚡", name: "Haiku",  coeff: "×0.3 — economical" },
      { icon: "✦", name: "Sonnet", coeff: "×1 — standard"     },
      { icon: "◆", name: "Opus",   coeff: "×5 — powerful"     },
    ],
    ctaFinalH2: "Try LIYA. 72 hours free, no commitment.",
    ctaFinalSub: "With or without a credit card. No installation. Up and running in under a minute.",
    ctaFinalBtn: "Start free trial",
    footerTagline: "Powerful, accessible AI built for African businesses.",
    footerProdLabel: "Product",
    footerProdLinks: [
      { label: "Features",        href: "#features"       },
      { label: "Pricing",         href: "#pricing"        },
      { label: "For lawyers",     href: "/pour-juristes"  },
      { label: "For banks",       href: "/pour-banques"   },
      { label: "For NGOs",        href: "/pour-ong"       },
      { label: "For accountants", href: "/pour-comptables" },
    ],
    footerCompanyLabel: "Company",
    footerCompanyLinks: ["About", "Contact", "Blog", "Careers"],
    footerLegalLabel: "Legal",
    footerLegalLinks: ["Terms", "Privacy", "Legal notice"],
    navLinks: [
      { label: "Product", href: "#features"  },
      { label: "For who", href: "#audiences" },
      { label: "Pricing", href: "#pricing"   },
      { label: "Sign in", href: "/login"     },
    ],
    navCta: "Free trial 72h",
  },

  ar: {
    dir: "rtl",
    supertitle: "الذكاء الاصطناعي المصمم لأفريقيا",
    h1a: "قوة الذكاء الاصطناعي،",
    h1b: "بمقياسك أنت.",
    subtitle: "من المستشار المستقل إلى الشركة الكبيرة، يتكيف LIYA مع احتياجاتك. اكتب، حلل، ترجم، لخص — بلغتك ومع سياقك الأفريقي.",
    heroStarterPrice: "تجربة مجانية 72 ساعة، ثم ابتداءً من 150 درهم / شهر.",
    ctaTry: "ابدأ التجربة المجانية",
    ctaPricing: "عرض الأسعار",
    trustBadges: ["مع أو بدون بطاقة بنكية", "تجربة مجانية 72 ساعة بدون التزام", "مدعوم بـ Claude (Anthropic)"],
    featuresLabel: "ثلاثة أشياء يفعلها LIYA من أجلك",
    featuresH2: "ذكاء اصطناعي قوي. بدون تعقيد.",
    featureCards: [
      { icon: "✏️", title: "اكتب أسرع وأفضل",           text: "رسائل، عقود، تقارير، عروض تقديمية. ينتج LIYA مسودة أولى احترافية في ثوانٍ تعدّلها بعد ذلك." },
      { icon: "🔍", title: "حلل مستنداتك",               text: "ارفع ملف PDF أو Word أو Excel. يستخرج LIYA النقاط الرئيسية ويكتشف التناقضات ويجيب على أسئلتك حول المحتوى." },
      { icon: "🌍", title: "بلغتك وسياقك المحلي",        text: "يتحدث LIYA لغتك مع الفروق الدقيقة المحلية. ويعرف المؤسسات والممارسات التجارية والحقائق الاقتصادية لسوقك." },
    ],
    compareLabel: "لماذا لا ChatGPT؟",
    compareH2: "نفس التقنية. مصممة لك.",
    compareSubtitle: "LIYA مدعوم بـ Claude، نموذج Anthropic — نفس الذكاء الاصطناعي الموجود في claude.ai، محسّن للسياق الأفريقي.",
    compareRows: [
      ["الدفع",           "بطاقة ائتمان بالدولار",              "درهم · موبايل موني · تحويل بنكي"],
      ["السياق المحلي",   "عام",                                  "يفهم السياق الأفريقي والمغاربي"],
      ["حسابات الفرق",    "خطط أمريكية / أوروبية",               "متعدد المستخدمين مع مدير محلي"],
      ["الدعم",           "بريد إلكتروني بالإنجليزية",           "ممثل محلي"],
      ["سعر الدخول",      "20 دولار · بطاقة أجنبية مطلوبة",     "تجربة 72 ساعة مجانية · ثم 150 درهم"],
    ],
    audiencesLabel: "لمن هو",
    audiencesH2: "لكل من يعمل في أفريقيا والمغرب العربي.",
    audiencesSub: "يتوسع LIYA معك، من مستخدم واحد إلى آلاف المستخدمين.",
    audienceCards: [
      {
        emoji: "👤",
        title: "أنت وحدك",
        text: "مستقل، مستشار، إطار في أي مجال. اكتب مقترحاتك، حلل عقودك، ترجم تقاريرك — مع أو بدون بطاقة بنكية.",
        price: "تجربة 72 ساعة مجانية · ثم 150 درهم/شهر",
      },
      {
        emoji: "👥",
        title: "فريقك",
        text: "المؤسسات الصغيرة والمتوسطة والفرق. كل فريقك على أداة واحدة. إدارة مركزية، مشاريع مشتركة، سياق عمل محفوظ.",
        price: "ابتداءً من 1500 درهم / شهر",
      },
      {
        emoji: "🏢",
        title: "مؤسستك",
        text: "الشركات الكبيرة والمؤسسات. خطط مخصصة لأكثر من 20 مستخدماً، دعم متخصص، امتثال للمتطلبات المحلية.",
        price: "عرض سعر مخصص",
      },
    ],
    audiencesFooter: "يُستخدم LIYA في المغرب وتونس وأفريقيا جنوب الصحراء من قِبل مكاتب المحاماة والبنوك والمنظمات غير الحكومية والشركات.",
    pricingLabel: "الأسعار",
    pricingH2: "أسعار واضحة بالدرهم المغربي لكل مرحلة.",
    pricingSub: "ابدأ مجاناً، اكتشف بدون التزام، طوّر قدراتك عندما تكون مستعداً.",
    currencyLabel: "درهم",
    pricingTiers: [
      {
        name: "تجربة مجانية",
        target: "72 ساعة لاكتشاف LIYA",
        amount: "0",
        amountSub: "72 ساعة · Haiku & Sonnet",
        features: [
          "وصول كامل لمدة 72 ساعة",
          "Haiku & Sonnet مشمولان",
          "المشاريع والمستندات",
          "مستخدم واحد",
          "بدون التزام",
        ],
        cta: "ابدأ التجربة",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "اكتشاف",
        target: "تجربة حقيقية للـ Premium",
        amount: "150",
        amountSub: "Opus مشمول · أقصاه 3 أشهر",
        features: [
          "200,000 رمز / شهر",
          "مستخدم واحد",
          "Haiku, Sonnet & Opus ✓",
          "المشاريع والمستندات",
          "التفكير الموسّع غير مشمول",
        ],
        cta: "اختر اكتشاف",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "Premium ✨",
        target: "القوة الكاملة، لك وحدك",
        amount: "330",
        amountSub: "Opus + تفكير · ~20,000 فرنك",
        features: [
          "500,000 رمز / شهر",
          "مستخدم واحد",
          "Haiku, Sonnet & Opus ✓",
          "التفكير الموسّع ✓",
          "مشاريع غير محدودة",
        ],
        cta: "اختر Premium",
        ctaStyle: "primary",
        featured: true,
      },
      {
        name: "Business 5",
        target: "لفريقك الصغير",
        amount: "1 500",
        amountSub: "5 مستخدمين · ~90,000 فرنك",
        features: [
          "1,500,000 رمز / شهر",
          "حتى 5 مستخدمين",
          "جميع النماذج بما فيها Opus",
          "التفكير الموسّع ✓",
          "إدارة الفريق",
        ],
        cta: "اختر Business 5",
        ctaStyle: "secondary",
        featured: false,
      },
      {
        name: "Business 20",
        target: "لمؤسستك المنظمة",
        amount: "3 300",
        amountSub: "20 مستخدماً · ~200,000 فرنك",
        features: [
          "4,000,000 رمز / شهر",
          "حتى 20 مستخدماً",
          "جميع النماذج بما فيها Opus",
          "إدارة متقدمة + سجلات تدقيق",
          "دعم ذو أولوية",
        ],
        cta: "اختر Business 20",
        ctaStyle: "secondary",
        featured: false,
      },
    ],
    topUpNote: "إعادة شحن في أي وقت: 170 درهم = 200,000 رمز إضافي.",
    modelsLabel: "حول النماذج",
    modelsH: "تتيح جميع الخطط المدفوعة (ما عدا الاكتشاف) التفكير الموسّع. يُحسب استهلاك الرموز بحسب النموذج المستخدم:",
    modelsList: [
      { icon: "⚡", name: "Haiku",  coeff: "×0.3 — اقتصادي"  },
      { icon: "✦", name: "Sonnet", coeff: "×1 — المرجع"     },
      { icon: "◆", name: "Opus",   coeff: "×5 — قوي"        },
    ],
    ctaFinalH2: "جرّب LIYA. 72 ساعة مجانية، بدون التزام.",
    ctaFinalSub: "مع أو بدون بطاقة بنكية. بدون تنزيل. جاهز في أقل من دقيقة.",
    ctaFinalBtn: "ابدأ التجربة المجانية",
    footerTagline: "ذكاء اصطناعي قوي ومتاح، مصمم للمؤسسات الأفريقية.",
    footerProdLabel: "المنتج",
    footerProdLinks: [
      { label: "المميزات",       href: "#features"        },
      { label: "الأسعار",        href: "#pricing"         },
      { label: "للمحامين",       href: "/pour-juristes"   },
      { label: "للبنوك",         href: "/pour-banques"    },
      { label: "للمنظمات",       href: "/pour-ong"        },
      { label: "للمحاسبين",      href: "/pour-comptables" },
    ],
    footerCompanyLabel: "الشركة",
    footerCompanyLinks: ["من نحن", "تواصل معنا", "المدونة", "الوظائف"],
    footerLegalLabel: "قانوني",
    footerLegalLinks: ["الشروط والأحكام", "الخصوصية", "الإشعار القانوني"],
    navLinks: [
      { label: "المنتج",         href: "#features"  },
      { label: "لمن",            href: "#audiences" },
      { label: "الأسعار",        href: "#pricing"   },
      { label: "تسجيل الدخول",  href: "/login"     },
    ],
    navCta: "تجربة مجانية 72 ساعة",
  },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function LandingPage({ locale = "fr" }: { locale?: Locale }) {
  const c = CONTENT[locale];

  const [showModal, setShowModal] = useState(false);
  const [form, setForm]   = useState({ name: "", company: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const refFeatures  = useFadeIn();
  const refCompare   = useFadeIn();
  const refAudiences = useFadeIn();
  const refPricing   = useFadeIn();

  const router = useRouter();

  function switchLocale(loc: Locale) {
    if (loc === locale) return;
    document.cookie = `NEXT_LOCALE=${loc}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    localStorage.setItem("liya_locale", loc);
    router.push(`/${loc}`);
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

      <div className="min-h-screen bg-aria-sand flex flex-col" dir={c.dir}>

        {/* ── Bandeau de confiance ─────────────────────────────── */}
        <div className="w-full bg-[#EFE9DD] border-b border-[#C8C2B5] py-2 text-center text-[13px] font-medium text-aria-terracotta tracking-[0.02em] sticky top-0 z-20">
          ✦ Powered by Claude · Anthropic
        </div>

        {/* ── Header ───────────────────────────────────────────── */}
        <header className="sticky top-[33px] z-10 bg-aria-sand/92 backdrop-blur-md border-b border-[#C8C2B5]/40 py-4">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between gap-4">
            {/* Logo */}
            <a href="#" className="relative font-display text-[28px] font-bold text-aria-indigo tracking-[-0.02em] shrink-0">
              {APP_NAME}
              <span className="absolute bottom-[6px] -right-2 w-[6px] h-[6px] rounded-full bg-aria-terracotta" />
            </a>

            {/* Nav */}
            <ul className="hidden md:flex gap-6 list-none" dir="ltr">
              {c.navLinks.map(({ label, href }) => (
                <li key={href}>
                  <a href={href} className="text-[15px] font-medium text-aria-anthracite hover:text-aria-terracotta transition-colors">
                    {label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Right side: locale switcher + CTA */}
            <div className="flex items-center gap-3 shrink-0" dir="ltr">
              {/* Language toggle */}
              <div className="flex items-center gap-1 bg-aria-indigo rounded-lg px-1.5 py-1">
                {(["fr", "en", "ar"] as Locale[]).map((loc) => (
                  <button
                    key={loc}
                    onClick={() => switchLocale(loc)}
                    title={loc.toUpperCase()}
                    className={`flex items-center gap-1 px-2 py-1 text-[13px] font-semibold rounded-md transition-colors ${
                      loc === locale
                        ? "bg-white/20 text-white"
                        : "text-white/60 hover:text-white/90 hover:bg-white/10"
                    }`}
                  >
                    <span>{LANG_FLAGS[loc]}</span>
                    <span>{LANG_LABELS[loc]}</span>
                  </button>
                ))}
              </div>

              {/* CTA */}
              <Link
                href="/login"
                className="hidden sm:inline-block bg-aria-terracotta text-white text-[15px] font-semibold px-5 py-2.5 rounded-lg hover:bg-aria-terracotta-dark transition-all hover:-translate-y-px shadow-sm"
              >
                {c.navCta}
              </Link>
            </div>
          </div>
        </header>

        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="pointer-events-none absolute top-12 -right-32 w-[500px] h-[500px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #D9A441 0%, transparent 70%)" }} />
          <div className="pointer-events-none absolute -bottom-24 -left-20 w-[400px] h-[400px] rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, #1A2A4F 0%, transparent 70%)" }} />

          <div className="max-w-6xl mx-auto px-6 relative z-10">
            <div className="max-w-[820px]">
              <p className="text-[13px] font-semibold tracking-[0.18em] uppercase text-aria-terracotta mb-6">
                {c.supertitle}
              </p>
              <h1 className="font-display text-[clamp(40px,6vw,68px)] font-bold leading-[1.05] text-aria-indigo tracking-[-0.025em] mb-7">
                {c.h1a}{" "}
                <span className="text-aria-terracotta italic font-semibold">{c.h1b}</span>
              </h1>
              <p className="text-[20px] leading-[1.55] text-aria-anthracite mb-4 max-w-[680px]">
                {c.subtitle}{" "}
                <span className="font-bold text-aria-indigo">{c.heroStarterPrice}</span>
              </p>
              <div className="flex flex-wrap gap-4 mt-9">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 bg-aria-terracotta text-white font-semibold text-[17px] px-8 py-4 rounded-lg hover:bg-aria-terracotta-dark transition-all hover:-translate-y-px shadow-md"
                >
                  {c.ctaTry}
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 border-[1.5px] border-aria-indigo text-aria-indigo font-semibold text-[17px] px-8 py-4 rounded-lg hover:bg-aria-indigo hover:text-white transition-all"
                >
                  {c.ctaPricing}
                </a>
              </div>
              <div className="flex flex-wrap gap-6 mt-8 text-[14px] text-aria-stone">
                {c.trustBadges.map(t => (
                  <span key={t} className="before:content-['✓_'] before:text-aria-terracotta before:font-bold">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────────── */}
        <section id="features" ref={refFeatures as React.RefObject<HTMLElement>} className="fade-section py-20">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-aria-terracotta mb-4">{c.featuresLabel}</p>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold text-aria-indigo tracking-[-0.02em] leading-[1.1] mb-4">{c.featuresH2}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
              {c.featureCards.map(({ icon, title, text }) => (
                <div key={title} className="feature-card relative bg-white rounded-2xl p-9 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300 overflow-hidden">
                  <div className="w-14 h-14 bg-aria-sand rounded-xl flex items-center justify-center text-[28px] mb-5">{icon}</div>
                  <h3 className="font-display text-[22px] font-semibold text-aria-indigo tracking-[-0.01em] mb-3">{title}</h3>
                  <p className="text-aria-stone text-[15px] leading-[1.65]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comparatif ───────────────────────────────────────── */}
        <section ref={refCompare as React.RefObject<HTMLElement>} className="fade-section bg-white py-20">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-aria-terracotta mb-4">{c.compareLabel}</p>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold text-aria-indigo tracking-[-0.02em] leading-[1.1] mb-4">{c.compareH2}</h2>
            <p className="text-[18px] text-aria-stone max-w-[660px] mb-8">{c.compareSubtitle}</p>
            <div className="bg-aria-sand rounded-2xl overflow-hidden mt-8" dir="ltr">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="bg-aria-indigo text-white font-semibold text-[15px] px-6 py-[18px] text-left w-1/3"></th>
                    <th className="bg-aria-indigo text-white font-semibold text-[15px] px-6 py-[18px] text-left">ChatGPT, Claude.ai</th>
                    <th className="bg-aria-terracotta text-white font-semibold text-[15px] px-6 py-[18px] text-left">LIYA</th>
                  </tr>
                </thead>
                <tbody>
                  {c.compareRows.map(([label, chatgpt, liya], i) => (
                    <tr key={label} className={i < c.compareRows.length - 1 ? "border-b border-[#C8C2B5]" : ""}>
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
        <section id="audiences" ref={refAudiences as React.RefObject<HTMLElement>} className="fade-section py-20">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-aria-terracotta mb-4">{c.audiencesLabel}</p>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold text-aria-indigo tracking-[-0.02em] leading-[1.1] mb-4">{c.audiencesH2}</h2>
            <p className="text-[18px] text-aria-stone mb-14">{c.audiencesSub}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {c.audienceCards.map(({ emoji, title, text, price }) => (
                <div key={title} className="bg-white rounded-2xl p-9 border-2 border-transparent hover:border-aria-terracotta hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
                  <span className="text-[36px] block mb-4">{emoji}</span>
                  <h4 className="font-display text-[22px] font-bold text-aria-indigo mb-3">{title}</h4>
                  <p className="text-aria-stone text-[15px] leading-[1.6] mb-5">{text}</p>
                  <p className="text-[14px] font-semibold text-aria-terracotta font-display">{price}</p>
                </div>
              ))}
            </div>
            <p className="mt-10 text-[15px] text-aria-stone text-center">{c.audiencesFooter}</p>
          </div>
        </section>

        {/* ── Tarifs ───────────────────────────────────────────── */}
        <section id="pricing" ref={refPricing as React.RefObject<HTMLElement>} className="fade-section bg-[#EFE9DD] py-20">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-[13px] font-semibold tracking-[0.15em] uppercase text-aria-terracotta mb-4">{c.pricingLabel}</p>
            <h2 className="font-display text-[clamp(32px,4vw,48px)] font-bold text-aria-indigo tracking-[-0.02em] leading-[1.1] mb-4">{c.pricingH2}</h2>
            <p className="text-[18px] text-aria-stone max-w-[660px] mb-14">{c.pricingSub}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
              {c.pricingTiers.map(({ name, target, amount, amountSub, features, cta, ctaStyle, featured }) => (
                <div key={name} className={`relative bg-white rounded-2xl p-7 text-center flex flex-col transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${featured ? "border-2 border-aria-terracotta scale-[1.02] shadow-xl hover:-translate-y-1" : "border-2 border-transparent"}`}>
                  {featured && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-aria-terracotta text-white text-xs font-semibold px-4 py-1 rounded-full tracking-[0.05em]">
                      {locale === "fr" ? "Recommandé" : locale === "en" ? "Recommended" : "موصى به"}
                    </span>
                  )}
                  <h4 className="font-display text-[22px] font-bold text-aria-indigo mb-1">{name}</h4>
                  <p className="text-[13px] text-aria-stone italic mb-6">{target}</p>
                  <div className="font-display text-[36px] font-extrabold text-aria-anthracite leading-none mb-1" dir="ltr">
                    {amount}
                    <span className="text-[18px] text-aria-stone font-normal"> {c.currencyLabel}</span>
                  </div>
                  <p className="text-[12px] text-aria-stone mb-6 font-medium">{amountSub}</p>
                  <ul className="text-left mb-6 pb-6 border-b border-[#C8C2B5] space-y-1.5 flex-1">
                    {features.map(f => (
                      <li key={f} className={`text-[14px] ${f.includes("non incluse") || f.includes("not included") || f.includes("غير مشمول") ? "text-aria-stone/60" : "text-aria-anthracite"}`}>
                        <span className={`font-bold mr-2 ${f.includes("non incluse") || f.includes("not included") || f.includes("غير مشمول") ? "text-aria-stone/40" : "text-aria-terracotta"}`}>
                          {f.includes("non incluse") || f.includes("not included") || f.includes("غير مشمول") ? "✗" : "✓"}
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`block w-full text-center py-3 rounded-lg text-[15px] font-semibold transition-colors ${ctaStyle === "primary" ? "bg-aria-terracotta text-white hover:bg-aria-terracotta-dark" : "border-[1.5px] border-aria-indigo text-aria-indigo hover:bg-aria-indigo hover:text-white"}`}
                  >
                    {cta}
                  </Link>
                </div>
              ))}
            </div>

            {/* Note recharge */}
            <p className="text-center mt-8 text-[14px] text-aria-stone italic">
              {c.topUpNote}{" "}
              <a href="#" className="text-aria-terracotta font-semibold hover:underline">
                {locale === "fr" ? "Demander un devis sur mesure →" : locale === "en" ? "Request a custom quote →" : "طلب عرض سعر مخصص →"}
              </a>
            </p>

            {/* Note Découverte */}
            <div className="mt-6 max-w-[760px] mx-auto bg-aria-ochre/10 border border-aria-ochre/30 rounded-xl px-6 py-4 flex gap-3">
              <span className="text-lg shrink-0">ℹ️</span>
              <p className="text-[14px] text-aria-anthracite leading-relaxed">
                {locale === "fr"
                  ? <><strong>Plan Découverte :</strong> inclut Opus pour que vous testiez la vraie puissance de l&apos;IA, mais sans la réflexion approfondie (Extended Thinking). Ce plan est disponible jusqu&apos;à 3 mois, puis vous passez naturellement à Premium.</>
                  : locale === "en"
                  ? <><strong>Discovery plan:</strong> includes Opus so you can experience real AI power, but without Extended Thinking. This plan is available for up to 3 months, then you naturally move to Premium.</>
                  : <><strong>خطة الاكتشاف:</strong> تشمل Opus لتجربة القوة الحقيقية للذكاء الاصطناعي، لكن بدون التفكير الموسّع. هذه الخطة متاحة لمدة أقصاها 3 أشهر، ثم تنتقل طبيعياً إلى Premium.</>
                }
              </p>
            </div>

            {/* Encart modèles */}
            <div className="mt-6 max-w-[760px] mx-auto bg-white rounded-xl border-l-4 border-aria-terracotta px-8 py-6">
              <p className="text-[13px] font-semibold tracking-[0.1em] uppercase text-aria-terracotta mb-3">{c.modelsLabel}</p>
              <p className="text-[15px] leading-[1.6] text-aria-anthracite mb-4">{c.modelsH}</p>
              <div className="grid grid-cols-3 gap-4">
                {c.modelsList.map(({ icon, name, coeff }) => (
                  <div key={name} className="bg-aria-sand rounded-lg p-3">
                    <strong className="text-aria-indigo">{icon} {name}</strong><br />
                    <span className="text-[13px] text-aria-stone">{coeff}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Final ─────────────────────────────────────────── */}
        <section id="cta-final" className="relative bg-aria-indigo text-white text-center py-24 overflow-hidden">
          <span
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-display font-extrabold leading-none select-none"
            style={{ fontSize: "clamp(180px, 30vw, 400px)", color: "rgba(255,255,255,0.04)", letterSpacing: "-0.05em" }}
            aria-hidden
          >
            LIYA
          </span>
          <div className="relative z-10 max-w-2xl mx-auto px-6">
            <h2 className="font-display text-[clamp(36px,5vw,56px)] font-bold tracking-[-0.02em] mb-6">{c.ctaFinalH2}</h2>
            <p className="text-[19px] opacity-85 mb-9 max-w-[520px] mx-auto">{c.ctaFinalSub}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-3 bg-aria-terracotta text-white font-semibold text-[17px] px-10 py-4 rounded-lg hover:bg-aria-ochre hover:text-aria-anthracite transition-all hover:-translate-y-px shadow-md"
            >
              {c.ctaFinalBtn}
            </Link>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────── */}
        <footer className="bg-aria-anthracite text-aria-sand pt-16 pb-6">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-10 mb-12">
              <div>
                <span className="relative font-display text-[32px] font-bold text-aria-sand tracking-[-0.02em]">
                  {APP_NAME}
                  <span className="absolute bottom-[6px] -right-2 w-[6px] h-[6px] rounded-full bg-aria-terracotta" />
                </span>
                <p className="mt-3 text-[14px] text-aria-stone max-w-[280px] mb-6">{c.footerTagline}</p>
                <a href="https://anthropic.com/claude" target="_blank" rel="noopener noreferrer" className="text-[17px] font-semibold text-aria-terracotta hover:underline">
                  ✦ Powered by Claude · Anthropic
                </a>
              </div>
              <div>
                <h5 className="text-white text-[13px] font-semibold tracking-[0.1em] uppercase mb-4">{c.footerProdLabel}</h5>
                <ul className="space-y-2.5">
                  {c.footerProdLinks.map(({ label, href }) => (
                    <li key={label}><a href={href} className="text-[14px] text-aria-stone hover:text-aria-terracotta transition-colors">{label}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-white text-[13px] font-semibold tracking-[0.1em] uppercase mb-4">{c.footerCompanyLabel}</h5>
                <ul className="space-y-2.5">
                  {c.footerCompanyLinks.map(l => (
                    <li key={l}><a href="#" className="text-[14px] text-aria-stone hover:text-aria-terracotta transition-colors">{l}</a></li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-white text-[13px] font-semibold tracking-[0.1em] uppercase mb-4">{c.footerLegalLabel}</h5>
                <ul className="space-y-2.5">
                  {c.footerLegalLinks.map(l => (
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
          <div className="fixed inset-0 bg-aria-anthracite/50 flex items-center justify-center z-50 p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-[#E8E2D6]">
              <h2 className="font-display text-xl font-semibold text-aria-indigo mb-5">
                {locale === "fr" ? "Demander l'accès entreprise" : locale === "en" ? "Request enterprise access" : "طلب وصول المؤسسات"}
              </h2>
              {status === "done" ? (
                <p className="text-aria-emerald py-4 text-sm font-medium">
                  {locale === "fr" ? "Demande envoyée. Nous vous contacterons bientôt." : locale === "en" ? "Request sent. We'll be in touch soon." : "تم إرسال الطلب. سنتواصل معك قريباً."}
                </p>
              ) : (
                <form onSubmit={submit} className="space-y-4" dir="ltr">
                  {[
                    { key: "name",    label: locale === "fr" ? "Nom complet" : locale === "en" ? "Full name" : "الاسم الكامل",           type: "text",  placeholder: "Jean Koné"           },
                    { key: "company", label: locale === "fr" ? "Entreprise"  : locale === "en" ? "Company"   : "الشركة",                 type: "text",  placeholder: "SIA Agile Solutions" },
                    { key: "email",   label: locale === "fr" ? "Adresse e-mail" : locale === "en" ? "Email address" : "البريد الإلكتروني", type: "email", placeholder: "you@company.com"     },
                  ].map(({ key, label, type, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-aria-stone uppercase tracking-wide mb-1.5">{label}</label>
                      <input required type={type} value={form[key as keyof typeof form]} placeholder={placeholder}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-[#C8C2B5] rounded-lg px-3 py-2.5 text-sm text-aria-anthracite bg-aria-sand focus:outline-none focus:border-aria-indigo transition-colors" />
                    </div>
                  ))}
                  {status === "error" && (
                    <p className="text-aria-red text-xs bg-aria-red/5 border border-aria-red/20 rounded-lg px-3 py-2">
                      {locale === "fr" ? "Erreur d'envoi. Veuillez réessayer." : locale === "en" ? "Send error. Please try again." : "خطأ في الإرسال. يرجى المحاولة مرة أخرى."}
                    </p>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="flex-1 border border-aria-indigo text-aria-indigo rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-aria-indigo-light transition-colors">
                      {locale === "fr" ? "Annuler" : locale === "en" ? "Cancel" : "إلغاء"}
                    </button>
                    <button type="submit" disabled={status === "loading"}
                      className="flex-1 bg-aria-terracotta text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-aria-terracotta-dark transition-colors disabled:opacity-50">
                      {status === "loading" ? "…" : locale === "fr" ? "Envoyer la demande" : locale === "en" ? "Send request" : "إرسال الطلب"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
