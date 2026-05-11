/**
 * Ajoute un utilisateur dans une entreprise existante.
 *
 * Usage (variables d'environnement) :
 *   EMAIL="user@company.com" NAME="Prénom Nom" TENANT_ID="clxxxxxxxx" \
 *   PASSWORD="motdepasse123" ROLE="user" \
 *   npx tsx prisma/add-user.ts
 *
 * Ou : éditez les constantes ci-dessous, puis lancez :
 *   npx tsx prisma/add-user.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

// ─── Modifiez ces valeurs ────────────────────────────────────────
const EMAIL     = process.env.EMAIL     ?? "utilisateur@entreprise.com";
const NAME      = process.env.NAME      ?? "Prénom Nom";
const TENANT_ID = process.env.TENANT_ID ?? "COLLER_ID_ENTREPRISE_ICI";
const PASSWORD  = process.env.PASSWORD  ?? "motdepasse123";
const ROLE      = process.env.ROLE      ?? "user"; // "user" | "admin"
// ─────────────────────────────────────────────────────────────────

async function main() {
  // Vérifier que l'entreprise existe
  const tenant = await prisma.tenant.findUnique({ where: { id: TENANT_ID } });
  if (!tenant) {
    console.error(`\n❌  Entreprise introuvable : "${TENANT_ID}"`);
    console.error("    Lancez d'abord :  npx tsx prisma/list-tenants.ts\n");
    process.exit(1);
  }

  // Vérifier que l'email n'est pas déjà utilisé
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing) {
    console.error(`\n⚠️   L'email "${EMAIL}" est déjà utilisé.`);
    console.error("    Utilisez le tableau de bord admin pour modifier cet utilisateur.\n");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      email:        EMAIL,
      name:         NAME || null,
      passwordHash,
      role:         ROLE,
      tenantId:     TENANT_ID,
      active:       true,
    },
  });

  console.log("\n✅  Utilisateur créé avec succès !\n");
  console.log(`    Nom        : ${user.name ?? "(non renseigné)"}`);
  console.log(`    Email      : ${user.email}`);
  console.log(`    Mot de passe : ${PASSWORD}`);
  console.log(`    Rôle       : ${user.role}`);
  console.log(`    Entreprise : ${tenant.name}  (${tenant.id})`);
  console.log(`    ID user    : ${user.id}`);
  console.log("\n    ⚠️  Communiquez l'email et le mot de passe à l'utilisateur.");
  console.log("       Conseillez-lui de changer son mot de passe dès la première connexion.\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
