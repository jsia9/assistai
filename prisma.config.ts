import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Use direct connection for migrations (not the pooler)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
