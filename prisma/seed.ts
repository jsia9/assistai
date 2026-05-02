import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

function parseSupabaseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "5432", 10),
    database: u.pathname.replace(/^\//, ""),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    ssl: { rejectUnauthorized: false },
  };
}

const config = parseSupabaseUrl(process.env.DIRECT_URL ?? process.env.DATABASE_URL!);
const pool = new pg.Pool(config);
const adapter = new PrismaPg(pool);
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

  const jamalHash = await bcrypt.hash("changeme123", 12);
  const jamal = await prisma.user.upsert({
    where: { email: "jamal@siaagilesolutions.com" },
    update: { role: "admin", active: true },
    create: {
      email: "jamal@siaagilesolutions.com",
      passwordHash: jamalHash,
      name: "Jamal",
      role: "admin",
      tenantId: tenant.id,
    },
  });

  console.log("\n✅ Seed terminé !\n");
  console.log("Tenant:", tenant.name);
  console.log("Admin 1:", admin.email, "/ changeme123");
  console.log("Admin 2:", jamal.email, "/ changeme123");
  console.log("Test user:", testUser.email, "/ test123");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
