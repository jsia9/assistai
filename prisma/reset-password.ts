/**
 * Réinitialise le mot de passe d'un utilisateur et s'assure qu'il est actif.
 *
 * Usage :
 *   EMAIL="jamal@siaagilesolutions.com" PASSWORD="NouveauMotDePasse123" \
 *   npx tsx prisma/reset-password.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const EMAIL    = process.env.EMAIL    ?? "jamal@siaagilesolutions.com";
const PASSWORD = process.env.PASSWORD ?? "ChangeMe123!";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error(`\n❌  Utilisateur introuvable : "${EMAIL}"\n`);
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const updated = await prisma.user.update({
    where: { email: EMAIL },
    data: { passwordHash, active: true },
    select: { id: true, email: true, role: true, active: true },
  });

  console.log("\n✅  Mot de passe réinitialisé !\n");
  console.log(`    Email      : ${updated.email}`);
  console.log(`    Rôle       : ${updated.role}`);
  console.log(`    Actif      : ${updated.active}`);
  console.log(`    Nouveau MDP: ${PASSWORD}`);
  console.log("\n    ⚠️  Connectez-vous et changez ce mot de passe immédiatement.\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
