import { locales, defaultLocale, type Locale } from "@/i18n";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;
  const isAr = locale === "ar";

  const titles = {
    fr: "Conditions Générales d'Utilisation",
    en: "Terms of Service",
    ar: "شروط الاستخدام",
  };

  return (
    <main className="max-w-3xl mx-auto px-6 py-16" dir={isAr ? "rtl" : "ltr"}>
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
        {titles[locale]}
      </h1>
      <p className="text-sm text-gray-500 mb-8">
        {locale === "fr" ? "Dernière mise à jour : mai 2026" : locale === "en" ? "Last updated: May 2026" : "آخر تحديث: مايو 2026"}
      </p>

      <section className="prose prose-gray max-w-none text-sm space-y-4">
        <p>
          {locale === "fr"
            ? "En accédant à LIYA, vous acceptez les présentes conditions d'utilisation. LIYA est un service d'assistance par intelligence artificielle propulsé par les modèles Claude d'Anthropic."
            : locale === "en"
            ? "By accessing LIYA, you agree to these terms of service. LIYA is an AI-powered assistant service powered by Anthropic's Claude models."
            : "باستخدامكم لـ LIYA، فإنكم توافقون على شروط الاستخدام هذه. LIYA خدمة مساعد ذكاء اصطناعي مدعومة بنماذج Claude من Anthropic."}
        </p>

        <h2 className="text-xl font-semibold mt-6">
          {locale === "fr" ? "Utilisation acceptable" : locale === "en" ? "Acceptable use" : "الاستخدام المقبول"}
        </h2>
        <p>
          {locale === "fr"
            ? "Il est interdit d'utiliser LIYA pour générer du contenu illégal, trompeur, ou violent, pour contourner des systèmes de sécurité, ou pour nuire à des tiers. L'accès est strictement réservé aux professionnels et à leurs collaborateurs autorisés."
            : locale === "en"
            ? "It is forbidden to use LIYA to generate illegal, misleading, or violent content, to bypass security systems, or to harm third parties. Access is strictly reserved for professionals and their authorized collaborators."
            : "يُحظر استخدام LIYA لإنشاء محتوى غير قانوني أو مضلل أو عنيف، أو لتجاوز أنظمة الأمان، أو الإضرار بأطراف ثالثة. يقتصر الوصول على المهنيين والمتعاونين المخولين."}
        </p>

        <h2 className="text-xl font-semibold mt-6">
          {locale === "fr" ? "Limitation de responsabilité" : locale === "en" ? "Limitation of liability" : "حدود المسؤولية"}
        </h2>
        <p>
          {locale === "fr"
            ? "Les réponses de LIYA sont générées par une IA et ne constituent pas des conseils juridiques, médicaux ou financiers. Toute décision basée sur les réponses de LIYA relève de la seule responsabilité de l'utilisateur."
            : locale === "en"
            ? "LIYA's responses are AI-generated and do not constitute legal, medical, or financial advice. Any decision based on LIYA's responses is solely the user's responsibility."
            : "ردود LIYA مولَّدة بالذكاء الاصطناعي ولا تمثل استشارات قانونية أو طبية أو مالية. يتحمل المستخدم وحده المسؤولية الكاملة عن أي قرار يتخذه بناءً على ردود LIYA."}
        </p>

        <h2 className="text-xl font-semibold mt-6">
          {locale === "fr" ? "Droit applicable" : locale === "en" ? "Governing law" : "القانون الواجب التطبيق"}
        </h2>
        <p>
          {locale === "fr"
            ? "Les présentes CGU sont régies par le droit applicable dans le pays du tenant. En cas de litige, les parties s'efforceront de trouver une résolution amiable avant tout recours judiciaire."
            : locale === "en"
            ? "These terms are governed by the laws applicable in the tenant's country. In case of dispute, the parties will attempt amicable resolution before any judicial proceedings."
            : "تخضع هذه الشروط للقانون المعمول به في بلد المستأجر. في حالة نزاع، تسعى الأطراف إلى التسوية الودية قبل اللجوء إلى القضاء."}
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-12">
        {locale === "fr" ? "Propulsé par Claude · Anthropic — LIYA est un produit de Sia Agile Solutions" : locale === "en" ? "Powered by Claude · Anthropic — LIYA is a product of Sia Agile Solutions" : "مدعوم بـ Claude · Anthropic — LIYA منتج من Sia Agile Solutions"}
      </p>
    </main>
  );
}
