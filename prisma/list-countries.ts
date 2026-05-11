/**
 * List all supported countries with their region, currency and locale.
 * Usage: npx tsx prisma/list-countries.ts [--region WA|MAGHREB|HOA]
 */
import { COUNTRIES, type Region } from "../lib/regions";

const filterRegion = process.argv.includes("--region")
  ? (process.argv[process.argv.indexOf("--region") + 1] as Region)
  : undefined;

const countries = Object.values(COUNTRIES).filter(c =>
  filterRegion ? c.region === filterRegion : true
);

console.log(`\n${"Code".padEnd(6)} ${"Country (FR)".padEnd(20)} ${"Region".padEnd(10)} ${"Currency".padEnd(10)} ${"Locale".padEnd(8)} ${"Timezone"}`);
console.log("─".repeat(80));
for (const c of countries) {
  console.log(
    `${c.code.padEnd(6)} ${c.name.fr.padEnd(20)} ${c.region.padEnd(10)} ${c.currency.padEnd(10)} ${c.defaultLocale.padEnd(8)} ${c.timezone}`
  );
}
console.log(`\nTotal: ${countries.length} country(ies)\n`);
