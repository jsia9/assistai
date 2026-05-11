import type { SupportedCurrency } from "@/lib/pricing";

/**
 * Format a monetary amount in the given currency.
 * Uses Western Arabic numerals (0-9) even for Arabic locale — modern Maghrebi convention.
 */
export function formatAmount(amount: number, currency: SupportedCurrency): string {
  switch (currency) {
    case "XOF":
      return `${amount.toLocaleString("fr-FR")} FCFA`;
    case "MAD":
      return `${amount.toLocaleString("fr-FR")} DH`;
    case "TND":
      return `${amount.toFixed(3)} DT`;
    case "ETB":
      return `${amount.toLocaleString("en-US")} ETB`;
    default:
      return `${amount} ${currency}`;
  }
}

/**
 * Format a USD-equivalent amount in small print.
 */
export function formatUsdEquivalent(usd: number): string {
  return `≈ $${usd.toLocaleString("en-US")}`;
}

/**
 * Return the currency symbol/abbreviation for a given currency code.
 */
export function currencySymbol(currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    XOF: "FCFA",
    MAD: "DH",
    TND: "DT",
    ETB: "ETB",
  };
  return symbols[currency] ?? currency;
}
