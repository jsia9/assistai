import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const email = "jamal@siaagilesolutions.com";
  const user = await prisma.user.update({
    where: { email },
    data: { role: "superadmin" },
    select: { id: true, email: true, role: true },
  });
  console.log("✅ Updated:", user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
