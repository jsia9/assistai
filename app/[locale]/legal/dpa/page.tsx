import { locales, defaultLocale, type Locale } from "@/i18n";

export default async function DpaPage({
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
    fr: "Accord de Traitement des Données (DPA)",
    en: "Data Processing Agreement (DPA)",
    ar: "اتفاقية معالجة البيانات (DPA)",
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
        <h2 className="text-xl font-semibold">
          {locale === "fr" ? "Parties" : locale === "en" ? "Parties" : "الأطراف"}
        </h2>
        <p>
          {locale === "fr"
            ? "Le présent DPA est conclu entre l'organisation cliente (ci-après « le Responsable du Traitement ») et Sia Agile Solutions, opérateur de LIYA (ci-après « le Sous-Traitant »)."
            : locale === "en"
            ? "This DPA is entered into between the client organization (the \"Data Controller\") and Sia Agile Solutions, operator of LIYA (the \"Data Processor\")."
            : "تُبرم هذه الاتفاقية بين المؤسسة العميلة («المسؤول عن المعالجة») وSia Agile Solutions، مشغّل LIYA («معالج البيانات»)."}
        </p>

        <h2 className="text-xl font-semibold mt-6">
          {locale === "fr" ? "Données traitées" : locale === "en" ? "Data processed" : "البيانات المعالجة"}
        </h2>
        <p>
          {locale === "fr"
            ? "Dans le cadre de l'utilisation de LIYA, les données suivantes sont traitées : (a) contenus des conversations entre les utilisateurs et l'IA ; (b) données d'identification des comptes ; (c) métadonnées d'utilisation (tokens consommés, horodatage)."
            : locale === "en"
            ? "In the context of using LIYA, the following data is processed: (a) conversation content between users and the AI; (b) account identification data; (c) usage metadata (tokens consumed, timestamps)."
            : "في إطار استخدام LIYA، تُعالج البيانات التالية: (أ) محتوى المحادثات بين المستخدمين والذكاء الاصطناعي؛ (ب) بيانات تعريف الحسابات؛ (ج) بيانات تعريفية للاستخدام (الرموز المستهلكة، الطوابع الزمنية)."}
        </p>

        <h2 className="text-xl font-semibold mt-6">
          {locale === "fr" ? "Hébergement et transferts" : locale === "en" ? "Hosting & transfers" : "الاستضافة والنقل"}
        </h2>
        <p>
          {locale === "fr"
            ? "Les données sont hébergées chez Supabase (région UE — Francfort, Allemagne). Les conversations sont transmises à Anthropic (États-Unis) pour traitement par les modèles Claude. Anthropic ne conserve pas les données au-delà de la durée de la requête (clause API enterprise)."
            : locale === "en"
            ? "Data is hosted with Supabase (EU region — Frankfurt, Germany). Conversations are transmitted to Anthropic (United States) for processing by Claude models. Anthropic does not retain data beyond the duration of the request (enterprise API clause)."
            : "تُستضاف البيانات لدى Supabase (منطقة الاتحاد الأوروبي — فرانكفورت، ألمانيا). تُرسل المحادثات إلى Anthropic (الولايات المتحدة) لمعالجتها بواسطة نماذج Claude. لا تحتفظ Anthropic بالبيانات بعد انتهاء الطلب (بند API المؤسسي)."}
        </p>

        <h2 className="text-xl font-semibold mt-6">
          {locale === "fr" ? "Mesures de sécurité" : locale === "en" ? "Security measures" : "تدابير الأمان"}
        </h2>
        <p>
          {locale === "fr"
            ? "Les données sont chiffrées au repos (AES-256) et en transit (TLS 1.3). L'accès est protégé par authentification et contrôle de rôle. Les journaux d'audit sont conservés pour la détection des incidents."
            : locale === "en"
            ? "Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Access is protected by authentication and role-based access control. Audit logs are retained for incident detection."
            : "تُشفَّر البيانات أثناء التخزين (AES-256) وأثناء النقل (TLS 1.3). يُحمى الوصول بالمصادقة والتحكم في الوصول القائم على الأدوار. تُحفظ سجلات التدقيق للكشف عن الحوادث."}
        </p>

        <div className="mt-8 p-4 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-500">
            {locale === "fr"
              ? "Pour obtenir une copie signée de ce DPA ou pour toute demande de conformité : contact@liya.digital"
              : locale === "en"
              ? "To obtain a signed copy of this DPA or for any compliance request: contact@liya.digital"
              : "للحصول على نسخة موقعة من هذه الاتفاقية أو لأي طلب امتثال: contact@liya.digital"}
          </p>
        </div>
      </section>

      <p className="text-xs text-gray-400 mt-12">
        {locale === "fr" ? "Propulsé par Claude · Anthropic — LIYA est un produit de Sia Agile Solutions" : locale === "en" ? "Powered by Claude · Anthropic — LIYA is a product of Sia Agile Solutions" : "مدعوم بـ Claude · Anthropic — LIYA منتج من Sia Agile Solutions"}
      </p>
    </main>
  );
}
