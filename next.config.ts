import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — refuse to render the app inside an iframe
  { key: "X-Frame-Options", value: "DENY" },
  // Block MIME sniffing — browser must honour the declared Content-Type
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer leakage across origins
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS for 2 years, include subdomains (Vercel already sends HSTS,
  // but being explicit means it also works on custom domains)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Permissions policy — disable APIs the app does not use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Content Security Policy
  // - default-src 'self'         → fallback: only same origin
  // - script-src 'self' 'unsafe-inline'  → Next.js inline scripts + hydration
  // - style-src  'self' 'unsafe-inline'  → Tailwind inline styles
  // - img-src    'self' data: blob: https:  → uploaded previews + web search images
  // - font-src   'self' data:            → self-hosted fonts
  // - connect-src 'self' https://api.anthropic.com
  //               → chat streaming calls to Anthropic
  // - frame-ancestors 'none'             → mirrors X-Frame-Options: DENY
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.anthropic.com https://howctlifltjffxwyolbz.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // pdf-parse, mammoth and exceljs use Node.js built-ins; keep them server-side only
  serverExternalPackages: ["pdf-parse", "mammoth", "exceljs"],

  async headers() {
    return [
      {
        // Apply security headers to every route
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
