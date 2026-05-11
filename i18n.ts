import { getRequestConfig } from "next-intl/server";

export const locales = ["fr", "en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "fr";

export default getRequestConfig(async ({ requestLocale }) => {
  // Validate locale
  const locale = (await requestLocale) as Locale;
  const resolved = locales.includes(locale) ? locale : defaultLocale;

  return {
    locale: resolved,
    messages: (await import(`./messages/${resolved}.json`)).default,
  };
});
