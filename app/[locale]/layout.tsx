import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "../globals.css";
import { Providers } from "../providers";
import { locales, defaultLocale, type Locale } from "@/i18n";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  weight: ["400", "600", "700", "800"],
  style: ["normal", "italic"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "LIYA";
const appTagline =
  process.env.NEXT_PUBLIC_APP_TAGLINE ??
  "L'assistant IA pour les professionnels et particuliers d'Afrique";

export const metadata: Metadata = {
  title: appName,
  description: appTagline,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = (locales as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : defaultLocale;

  // RTL for Arabic only — logos, code blocks, numbers stay LTR via dir="ltr" on inner elements
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} h-full`}
    >
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
