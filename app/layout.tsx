import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

/*
 * LIYA Typography (charte §6 + liya-home-mockup.html)
 *
 * Display — Fraunces (serif, italic-capable, 800w pour logo)
 * Body    — Inter
 * Mono    — JetBrains Mono
 *
 * next/font auto-héberge les polices au build : pas de CDN externe,
 * pas de modification de CSP nécessaire.
 */
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
  "L'assistant IA pour les professionnels et particuliers d'Afrique de l'Ouest";

export const metadata: Metadata = {
  title: appName,
  description: appTagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable} h-full`}
    >
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
