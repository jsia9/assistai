export type Region = "WA" | "MAGHREB" | "HOA";
export type SupportedCurrency = "XOF" | "MAD" | "TND" | "ETB";
export type SupportedLocale = "fr" | "en" | "ar";

export interface CountryConfig {
  code: string;               // ISO 3166-1 alpha-2
  name: { fr: string; en: string; ar: string };
  region: Region;
  currency: SupportedCurrency;
  defaultLocale: SupportedLocale;
  timezone: string;
  paymentMethods: string[];
}

export const COUNTRIES: Record<string, CountryConfig> = {
  // ── West Africa — existing ─────────────────────────────────────
  SN: {
    code: "SN",
    name: { fr: "Sénégal", en: "Senegal", ar: "السنغال" },
    region: "WA", currency: "XOF", defaultLocale: "fr",
    timezone: "Africa/Dakar",
    paymentMethods: ["cash", "wave", "orange_money", "bank_transfer"],
  },
  ML: {
    code: "ML",
    name: { fr: "Mali", en: "Mali", ar: "مالي" },
    region: "WA", currency: "XOF", defaultLocale: "fr",
    timezone: "Africa/Bamako",
    paymentMethods: ["cash", "orange_money", "bank_transfer"],
  },
  CI: {
    code: "CI",
    name: { fr: "Côte d'Ivoire", en: "Ivory Coast", ar: "ساحل العاج" },
    region: "WA", currency: "XOF", defaultLocale: "fr",
    timezone: "Africa/Abidjan",
    paymentMethods: ["cash", "wave", "orange_money", "bank_transfer"],
  },
  BF: {
    code: "BF",
    name: { fr: "Burkina Faso", en: "Burkina Faso", ar: "بوركينا فاسو" },
    region: "WA", currency: "XOF", defaultLocale: "fr",
    timezone: "Africa/Ouagadougou",
    paymentMethods: ["cash", "orange_money", "bank_transfer"],
  },
  NE: {
    code: "NE",
    name: { fr: "Niger", en: "Niger", ar: "النيجر" },
    region: "WA", currency: "XOF", defaultLocale: "fr",
    timezone: "Africa/Niamey",
    paymentMethods: ["cash", "orange_money", "bank_transfer"],
  },
  GN: {
    code: "GN",
    name: { fr: "Guinée", en: "Guinea", ar: "غينيا" },
    region: "WA", currency: "XOF", defaultLocale: "fr",
    timezone: "Africa/Conakry",
    paymentMethods: ["cash", "orange_money", "bank_transfer"],
  },
  TG: {
    code: "TG",
    name: { fr: "Togo", en: "Togo", ar: "توغو" },
    region: "WA", currency: "XOF", defaultLocale: "fr",
    timezone: "Africa/Lome",
    paymentMethods: ["cash", "wave", "bank_transfer"],
  },
  BJ: {
    code: "BJ",
    name: { fr: "Bénin", en: "Benin", ar: "بنين" },
    region: "WA", currency: "XOF", defaultLocale: "fr",
    timezone: "Africa/Porto-Novo",
    paymentMethods: ["cash", "wave", "orange_money", "bank_transfer"],
  },

  // ── Maghreb — new ──────────────────────────────────────────────
  MA: {
    code: "MA",
    name: { fr: "Maroc", en: "Morocco", ar: "المغرب" },
    region: "MAGHREB", currency: "MAD", defaultLocale: "ar",
    timezone: "Africa/Casablanca",
    paymentMethods: ["cash", "cashplus", "bank_transfer", "wafacash"],
  },
  TN: {
    code: "TN",
    name: { fr: "Tunisie", en: "Tunisia", ar: "تونس" },
    region: "MAGHREB", currency: "TND", defaultLocale: "ar",
    timezone: "Africa/Tunis",
    paymentMethods: ["cash", "d17", "bank_transfer", "lapostepay"],
  },
  DZ: {
    code: "DZ",
    name: { fr: "Algérie", en: "Algeria", ar: "الجزائر" },
    region: "MAGHREB", currency: "MAD", defaultLocale: "ar",
    timezone: "Africa/Algiers",
    paymentMethods: ["cash", "bank_transfer"],
  },

  // ── Horn of Africa — new ───────────────────────────────────────
  ET: {
    code: "ET",
    name: { fr: "Éthiopie", en: "Ethiopia", ar: "إثيوبيا" },
    region: "HOA", currency: "ETB", defaultLocale: "en",
    timezone: "Africa/Addis_Ababa",
    paymentMethods: ["cash", "telebirr", "cbe_birr", "bank_transfer"],
  },
};

/** Convenience: get all countries for a given region */
export function getCountriesByRegion(region: Region): CountryConfig[] {
  return Object.values(COUNTRIES).filter(c => c.region === region);
}

/** Convenience: look up a country, falling back to Senegal defaults */
export function getCountry(code: string): CountryConfig {
  return COUNTRIES[code] ?? COUNTRIES["SN"];
}
