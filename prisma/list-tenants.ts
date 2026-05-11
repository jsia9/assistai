/**
 * Liste toutes les entreprises et leurs utilisateurs.
 * Usage : npx tsx prisma/list-tenants.ts
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: {
      users: { select: { email: true, name: true, role: true, active: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (tenants.length === 0) {
    console.log("Aucune entreprise trouvée.");
    return;
  }

  console.log("\n══════════════════════════════════════════════════");
  console.log("  LISTE DES ENTREPRISES");
  console.log("══════════════════════════════════════════════════\n");

  for (const t of tenants) {
    console.log(`📁  ${t.name}`);
    console.log(`    ID      : ${t.id}`);
    console.log(`    Plan    : ${t.plan}   |   Actif : ${t.active ? "oui" : "non"}`);
    console.log(`    Quota   : ${t.monthlyTokenLimit.toLocaleString("fr-FR")} tokens/mois`);
    console.log(`    Utilisateurs (${t.users.length}) :`);
    for (const u of t.users) {
      const status = u.active ? "✅" : "🚫";
      console.log(`      ${status}  ${u.email}  [${u.role}]${u.name ? "  — " + u.name : ""}`);
    }
    console.log("");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
