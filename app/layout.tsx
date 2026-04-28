import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "AssistAI";
const appTagline =
  process.env.NEXT_PUBLIC_APP_TAGLINE ??
  "L'IA professionnelle pour l'Afrique de l'Ouest";

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
    <html lang="fr" className={`${geist.variable} h-full`}>
      <body className="h-full font-sans antialiased bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
