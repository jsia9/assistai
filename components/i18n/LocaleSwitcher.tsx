"use client";

import { useRouter, usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n";

const FLAGS: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇬🇧",
  ar: "🇲🇦",
};

/**
 * Sidebar locale switcher. Persists choice via cookie (NEXT_LOCALE) and
 * localStorage (liya_locale) so the proxy can redirect on next visit.
 */
export function LocaleSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(locale: Locale) {
    if (locale === currentLocale) return;

    // Persist choice
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    localStorage.setItem("liya_locale", locale);

    // Swap locale prefix in current pathname
    const segments = pathname.split("/");
    // segments[1] is the current locale (e.g. "fr")
    segments[1] = locale;
    const newPath = segments.join("/") || `/${locale}`;
    router.push(newPath);
  }

  return (
    <div className="flex gap-1 items-center" dir="ltr">
      {(locales as readonly Locale[]).map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          title={loc.toUpperCase()}
          className={`px-1.5 py-0.5 text-xs rounded transition-colors ${
            loc === currentLocale
              ? "bg-white/20 text-white font-semibold"
              : "text-white/60 hover:text-white/90 hover:bg-white/10"
          }`}
        >
          {FLAGS[loc]} {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
