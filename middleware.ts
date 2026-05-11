/**
 * Next.js Edge Middleware — rate limiting for sensitive endpoints.
 *
 * Runs on Vercel's Edge network before any serverless function executes.
 * Limits:
 *   • Login endpoint  (/api/auth/callback/credentials) — 5 POST per 15 min per IP
 *   • Chat endpoint   (/api/chat)                      — 60 POST per 1 min  per IP
 *
 * The rate-limit store is module-level (survives across requests in the same
 * Edge worker, but NOT shared across workers). For multi-region distributed
 * limits, replace with @upstash/ratelimit + Upstash Redis.
 */

import { NextRequest, NextResponse } from "next/server";

// ── Inline rate limiter (no external deps, Edge-runtime safe) ─────────────
interface Entry { count: number; resetAt: number }
const store = new Map<string, Entry>();

function check(key: string, max: number, windowMs: number): { ok: boolean; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, resetAt: now + windowMs };
  }
  if (entry.count >= max) {
    return { ok: false, resetAt: entry.resetAt };
  }
  entry.count += 1;
  return { ok: true, resetAt: entry.resetAt };
}

// ── Middleware ─────────────────────────────────────────────────────────────
export function middleware(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const { pathname } = req.nextUrl;
  const method = req.method;

  // Rate-limit login — 5 attempts per 15 minutes per IP
  if (method === "POST" && pathname === "/api/auth/callback/credentials") {
    const result = check(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!result.ok) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // Rate-limit payment initiation — 10 attempts per minute per IP
  if (method === "POST" && pathname === "/api/payments/initiate") {
    const result = check(`payments-initiate:${ip}`, 10, 60 * 1000);
    if (!result.ok) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: "Trop de tentatives de paiement. Attendez une minute avant de réessayer.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // Rate-limit chat — 60 messages per minute per IP
  if (method === "POST" && pathname === "/api/chat") {
    const result = check(`chat:${ip}`, 60, 60 * 1000);
    if (!result.ok) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: "Trop de messages envoyés. Attendez une minute avant de continuer.",
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // Rate-limit demo chat — 3 requests per minute per IP
  if (method === "POST" && pathname === "/api/chat/demo") {
    const result = check(`demo:${ip}`, 3, 60 * 1000);
    if (!result.ok) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({ error: "Trop de messages. Attendez une minute avant de réessayer." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // NextAuth credentials callback
    "/api/auth/callback/credentials",
    // Chat streaming endpoint
    "/api/chat",
    // Demo chat endpoint
    "/api/chat/demo",
    // Payment initiation endpoint
    "/api/payments/initiate",
  ],
};
