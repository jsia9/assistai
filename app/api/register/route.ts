/**
 * POST /api/register
 * Public self-registration endpoint — creates a Tenant + admin User.
 */
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";
import { PLAN_MAX_DAYS } from "@/lib/billing";

export async function POST(req: NextRequest) {
  // Rate limit: 3 registrations per IP per hour
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = checkRateLimit(`register:${ip}`, 3, 60 * 60 * 1000);
  if (!limit.ok) {
    return Response.json(
      { error: "Trop de tentatives. Réessayez dans une heure." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const { name, email, password, company } = body as {
    name?: string;
    email?: string;
    password?: string;
    company?: string;
  };

  // Validation
  if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 120) {
    return Response.json(
      { error: "Le nom doit comporter entre 2 et 120 caractères." },
      { status: 400 }
    );
  }

  if (
    !email ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    return Response.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return Response.json(
      { error: "Le mot de passe doit comporter au moins 8 caractères." },
      { status: 400 }
    );
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanCompany = typeof company === "string" ? company.trim() : cleanName;

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
  if (existing) {
    return Response.json(
      { error: "Cette adresse e-mail est déjà associée à un compte." },
      { status: 409 }
    );
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Compute trial period
  const now = new Date();
  const trialDays = PLAN_MAX_DAYS["trial"] ?? 3;
  const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  // Create Tenant + User in a transaction
  const { trialEndsAt: savedTrialEndsAt } = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: cleanCompany,
        plan: "trial",
        monthlyTokenLimit: 50_000,
        active: true,
        countryCode: "SN",
        region: "WA",
        currency: "XOF",
        defaultLocale: "fr",
        timezone: "Africa/Dakar",
        planStartedAt: now,
        trialEndsAt,
      },
    });

    await tx.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        passwordHash: hashedPassword,
        role: "admin",
        active: true,
        tenantId: tenant.id,
      },
    });

    return { trialEndsAt };
  });

  return Response.json({ success: true, trialEndsAt: savedTrialEndsAt.toISOString() });
}
