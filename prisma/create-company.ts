/**
 * Crée une nouvelle entreprise ET son premier utilisateur (admin).
 *
 * Usage (variables d'environnement) :
 *   COMPANY="Cabinet Berrada" EMAIL="admin@berrada.ma" NAME="Driss Berrada" \
 *   PASSWORD="motdepasse123" ROLE="admin" PLAN="starter" TOKEN_LIMIT="500000" \
 *   COUNTRY_CODE="MA" \
 *   npx tsx prisma/create-company.ts
 *
 * COUNTRY_CODE is optional — defaults to "SN" (Senegal).
 * The region, currency, defaultLocale and timezone are inferred from COUNTRY_CODE.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { COUNTRIES, getCountry } from "../lib/regions";
import { cloneTemplatesForUser } from "./seed-templates";
import { PLAN_MAX_DAYS } from "../lib/billing";

// ─── Modifiez ces valeurs ────────────────────────────────────────
const COMPANY      = process.env.COMPANY      ?? "Nouvelle Entreprise";
const EMAIL        = process.env.EMAIL        ?? "admin@entreprise.com";
const NAME         = process.env.NAME         ?? "Prénom Nom";
const PASSWORD     = process.env.PASSWORD     ?? "motdepasse123";
const ROLE         = process.env.ROLE         ?? "admin"; // "user" | "admin"
const PLAN         = process.env.PLAN         ?? "trial"; // "trial" | "decouverte" | "premium" | "business5" | "business20"
const TOKEN_LIMIT  = parseInt(process.env.TOKEN_LIMIT  ?? "50000", 10);
const COUNTRY_CODE = (process.env.COUNTRY_CODE ?? "SN").toUpperCase();
// ─────────────────────────────────────────────────────────────────

async function main() {
  // Look up country config
  const country = getCountry(COUNTRY_CODE);
  if (!COUNTRIES[COUNTRY_CODE]) {
    console.warn(`\n⚠️  Country code "${COUNTRY_CODE}" not found in COUNTRIES config — using Senegal defaults.\n`);
  }

  // Vérifier unicité email
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.error(`\n⚠️   L'email "${EMAIL}" est déjà utilisé.\n`);
    process.exit(1);
  }

  // Stamp plan lifecycle fields
  const now = new Date();
  const trialEndsAt =
    PLAN === "trial"
      ? new Date(now.getTime() + (PLAN_MAX_DAYS["trial"] ?? 3) * 24 * 60 * 60 * 1000)
      : null;

  // Créer l'entreprise avec les champs régionaux
  const tenant = await prisma.tenant.create({
    data: {
      name:              COMPANY,
      plan:              PLAN,
      monthlyTokenLimit: TOKEN_LIMIT,
      active:            true,
      country:           COUNTRY_CODE,   // legacy field
      countryCode:       COUNTRY_CODE,
      region:            country.region,
      currency:          country.currency,
      defaultLocale:     country.defaultLocale,
      timezone:          country.timezone,
      planStartedAt:     now,
      trialEndsAt,
    } as Parameters<typeof prisma.tenant.create>[0]["data"],
  });

  // Créer l'utilisateur
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const user = await prisma.user.create({
    data: {
      email:        EMAIL,
      name:         NAME || null,
      passwordHash,
      role:         ROLE,
      tenantId:     tenant.id,
      active:       true,
    },
  });

  // Cloner les templates de démarrage pour ce pays
  console.log("\n  📋 Clonage des projets de démarrage…");
  await cloneTemplatesForUser(user.id, tenant.id, COUNTRY_CODE);

  console.log("\n✅  Entreprise et utilisateur créés !\n");
  console.log(`──── ENTREPRISE ────────────────────────────────`);
  console.log(`    Nom          : ${tenant.name}`);
  console.log(`    ID           : ${tenant.id}`);
  console.log(`    Plan         : ${tenant.plan}`);
  console.log(`    Quota/mois   : ${TOKEN_LIMIT.toLocaleString("fr-FR")} tokens`);
  console.log(`    Pays         : ${country.name.fr} (${COUNTRY_CODE})`);
  console.log(`    Région       : ${country.region}`);
  console.log(`    Devise       : ${country.currency}`);
  console.log(`    Langue déf.  : ${country.defaultLocale}`);
  console.log(`    Fuseau       : ${country.timezone}`);
  console.log(`\n──── UTILISATEUR ───────────────────────────────`);
  console.log(`    Nom          : ${user.name ?? "(non renseigné)"}`);
  console.log(`    Email        : ${user.email}`);
  console.log(`    Mot de passe : ${PASSWORD}`);
  console.log(`    Rôle         : ${user.role}`);
  console.log(`    ID user      : ${user.id}`);
  console.log("\n    ⚠️  Communiquez l'email et le mot de passe à l'utilisateur.");
  console.log("       Conseillez-lui de changer son mot de passe dès la première connexion.\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
