/**
 * Crée une nouvelle entreprise ET son premier utilisateur (admin).
 *
 * Usage (variables d'environnement) :
 *   COMPANY="Société XYZ" EMAIL="directeur@xyz.com" NAME="Directeur XYZ" \
 *   PASSWORD="motdepasse123" ROLE="admin" PLAN="starter" TOKEN_LIMIT="500000" \
 *   npx tsx prisma/create-company.ts
 *
 * Ou : éditez les constantes ci-dessous, puis lancez :
 *   npx tsx prisma/create-company.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

// ─── Modifiez ces valeurs ────────────────────────────────────────
const COMPANY     = process.env.COMPANY     ?? "Nouvelle Entreprise";
const EMAIL       = process.env.EMAIL       ?? "admin@entreprise.com";
const NAME        = process.env.NAME        ?? "Prénom Nom";
const PASSWORD    = process.env.PASSWORD    ?? "motdepasse123";
const ROLE        = process.env.ROLE        ?? "admin"; // "user" | "admin"
const PLAN        = process.env.PLAN        ?? "starter"; // "starter" | "pro" | "enterprise"
const TOKEN_LIMIT = parseInt(process.env.TOKEN_LIMIT ?? "500000", 10); // tokens/mois
// ─────────────────────────────────────────────────────────────────

async function main() {
  // Vérifier unicité email
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.error(`\n⚠️   L'email "${EMAIL}" est déjà utilisé.\n`);
    process.exit(1);
  }

  // Créer l'entreprise
  const tenant = await prisma.tenant.create({
    data: {
      name:              COMPANY,
      plan:              PLAN,
      monthlyTokenLimit: TOKEN_LIMIT,
      active:            true,
    },
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

  console.log("\n✅  Entreprise et utilisateur créés !\n");
  console.log(`──── ENTREPRISE ────────────────────────────────`);
  console.log(`    Nom          : ${tenant.name}`);
  console.log(`    ID           : ${tenant.id}`);
  console.log(`    Plan         : ${tenant.plan}`);
  console.log(`    Quota/mois   : ${TOKEN_LIMIT.toLocaleString("fr-FR")} tokens`);
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
