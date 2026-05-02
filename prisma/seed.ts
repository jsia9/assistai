import { PrismaClient } from "../app/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant" },
    update: {},
    create: { id: "demo-tenant", name: "Demo Tenant", plan: "starter" },
  });

  const adminHash = await bcrypt.hash("changeme123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@yourdomain.com" },
    update: {},
    create: {
      email: "admin@yourdomain.com",
      passwordHash: adminHash,
      name: "Admin",
      role: "admin",
      tenantId: tenant.id,
    },
  });

  const testHash = await bcrypt.hash("test123", 12);
  const testUser = await prisma.user.upsert({
    where: { email: "test@demo.com" },
    update: {},
    create: {
      email: "test@demo.com",
      passwordHash: testHash,
      name: "Utilisateur Test",
      role: "user",
      tenantId: tenant.id,
    },
  });

  console.log("\n✅ Seed terminé !\n");
  console.log("Tenant créé :", tenant.name);
  console.log("\nCompte administrateur :");
  console.log("  Email    :", admin.email);
  console.log("  Password : changeme123");
  console.log("\nCompte test :");
  console.log("  Email    :", testUser.email);
  console.log("  Password : test123");
  console.log("\n⚠️  Changez les mots de passe après le premier déploiement !\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
