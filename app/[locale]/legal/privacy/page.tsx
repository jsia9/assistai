import { locales, defaultLocale, type Locale } from "@/i18n";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenantContext";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;

  // Try to get tenant context for region-specific content
  const session = await getServerSession(authOptions).catch(() => null);
  let region = "WA";
  let countryCode = "SN";

  if (session?.user?.tenantId) {
    try {
      const ctx = await getTenantContext(session.user.tenantId);
      region = ctx.tenant.region;
      countryCode = ctx.tenant.countryCode;
    } catch {
      // Fall through with defaults
    }
  }

  const isAr = locale === "ar";
  const dataResidencyText = {
    fr: "LIYA stocke ses données chez Supabase (région UE — Francfort) et utilise les API d'Anthropic (États-Unis). Les conversations sont chiffrées au repos et en transit. Aucune donnée n'est utilisée pour entraîner les modèles d'Anthropic (clause API enterprise).",
    en: "LIYA stores data with Supabase (EU region — Frankfurt) and uses Anthropic's API (United States). Conversations are encrypted at rest and in transit. No data is used to train Anthropic models (enterprise API clause).",
    ar: "تقوم LIYA بتخزين البيانات لدى Supabase (منطقة الاتحاد الأوروبي — فرانكفورت) وتستخدم واجهة برمجة تطبيقات Anthropic (الولايات المتحدة). تُشفَّر المحادثات أثناء التخزين والنقل. لا تُستخدم أي بيانات لتدريب نماذج Anthropic (بند API المؤسسي).",
  };

  const legalRef = {
    WA: { fr: "Loi n° 2008-12 du 25 janvier 2008 sur la protection des données à caractère personnel (République du Sénégal)", en: "Law No. 2008-12 of 25 January 2008 on the protection of personal data (Senegal)", ar: "القانون رقم 2008-12 الصادر بتاريخ 25 يناير 2008 بشأن حماية البيانات الشخصية (السنغال)" },
    MAGHREB_MA: { fr: "Loi 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel — CNDP (Maroc)", en: "Law 09-08 on the protection of personal data — CNDP (Morocco)", ar: "القانون 09-08 المتعلق بحماية الأشخاص الذاتيين تجاه معالجة المعطيات ذات الطابع الشخصي — CNDP (المغرب)" },
    MAGHREB_TN: { fr: "Loi organique n° 2004-63 du 27 juillet 2004, portant sur la protection des données à caractère personnel — INPDP (Tunisie)", en: "Organic Law No. 2004-63 of 27 July 2004 on the protection of personal data — INPDP (Tunisia)", ar: "القانون الأساسي عدد 2004-63 المؤرخ في 27 يوليو 2004 المتعلق بحماية المعطيات الشخصية — INPDP (تونس)" },
    HOA: { fr: "Personal Data Protection Proclamation 1321/2024 — EDPA (Éthiopie)", en: "Personal Data Protection Proclamation 1321/2024 — EDPA (Ethiopia)", ar: "مرسوم حماية البيانات الشخصية رقم 1321/2024 — EDPA (إثيوبيا)" },
  };

  const regionKey = region === "MAGHREB"
    ? countryCode === "MA" ? "MAGHREB_MA" : "MAGHREB_TN"
    : region === "HOA" ? "HOA" : "WA";

  const ref = legalRef[regionKey as keyof typeof legalRef][locale] ?? legalRef[regionKey as keyof typeof legalRef]["fr"];
  const residency = dataResidencyText[locale];

  const titles = { fr: "Politique de confidentialité", en: "Privacy Policy", ar: "سياسة الخصوصية" };
  const lastUpdated = { fr: "Dernière mise à jour : mai 2026", en: "Last updated: May 2026", ar: "آخر تحديث: مايو 2026" };

  return (
    <main className="max-w-3xl mx-auto px-6 py-16" dir={isAr ? "rtl" : "ltr"}>
      <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "var(--font-fraunces)" }}>
        {titles[locale]}
      </h1>
      <p className="text-sm text-gray-500 mb-8">{lastUpdated[locale]}</p>

      {/* Data residency disclosure */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <p className="text-sm text-blue-800">{residency}</p>
      </section>

      {/* Legal framework */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {locale === "fr" ? "Cadre légal applicable" : locale === "en" ? "Applicable legal framework" : "الإطار القانوني المنطبق"}
        </h2>
        <p className="text-gray-700 text-sm">{ref}</p>
      </section>

      {/* Data controller */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {locale === "fr" ? "Responsable du traitement" : locale === "en" ? "Data controller" : "المسؤول عن المعالجة"}
        </h2>
        <p className="text-gray-700 text-sm">
          {locale === "fr"
            ? "Votre organisation (le tenant LIYA) est responsable du traitement des données de ses utilisateurs. LIYA (Sia Agile Solutions) agit en qualité de sous-traitant."
            : locale === "en"
            ? "Your organization (the LIYA tenant) is the data controller for its users' data. LIYA (Sia Agile Solutions) acts as a data processor."
            : "مؤسستكم (المستأجر على LIYA) هي المسؤولة عن معالجة بيانات مستخدميها. تعمل LIYA (Sia Agile Solutions) بوصفها معالجاً للبيانات."}
        </p>
      </section>

      {/* Contact */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {locale === "fr" ? "Contact" : locale === "en" ? "Contact" : "تواصل معنا"}
        </h2>
        <p className="text-gray-700 text-sm">
          {locale === "fr"
            ? "Pour toute demande relative à vos données personnelles : contact@liya.digital"
            : locale === "en"
            ? "For any data protection enquiry: contact@liya.digital"
            : "لأي استفسار يتعلق بحماية بياناتكم: contact@liya.digital"}
        </p>
      </section>

      <p className="text-xs text-gray-400 mt-12">
        {locale === "fr"
          ? "Propulsé par Claude · Anthropic — LIYA est un produit de Sia Agile Solutions"
          : locale === "en"
          ? "Powered by Claude · Anthropic — LIYA is a product of Sia Agile Solutions"
          : "مدعوم بـ Claude · Anthropic — LIYA منتج من Sia Agile Solutions"}
      </p>
    </main>
  );
}
