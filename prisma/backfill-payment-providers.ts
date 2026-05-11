import { prisma } from "../lib/prisma";
async function main() {
  // Set providerName = "cash" for payments without one (old records default to "cash" already from schema)
  // Set transactionId for old cash payments that don't have one
  const payments = await prisma.payment.findMany({ where: { transactionId: null } });
  for (const p of payments) {
    await prisma.payment.update({
      where: { id: p.id },
      data: { transactionId: `CASH-${p.id}` }
    });
  }
  console.log(`Backfilled ${payments.length} payments`);
  await prisma.$disconnect();
}
main();
