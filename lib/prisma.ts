import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

function parseSupabaseUrl(url: string) {
  // pg's URL parser drops the tenant suffix from usernames like
  // "postgres.projectref" — parse manually and pass explicit config.
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

function createPrismaClient() {
  const config = parseSupabaseUrl(process.env.DATABASE_URL!);
  const pool = new pg.Pool(config);
  const adapter = new PrismaPg(pool);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
