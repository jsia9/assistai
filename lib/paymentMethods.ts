import type { SupportedCurrency } from "@/lib/pricing";

export interface PaymentMethod {
  id: string;
  label: { fr: string; en: string; ar: string };
  instructionsKey: string;   // i18n key for the instructions block
  icon: string;              // emoji
  available: SupportedCurrency[];
}

export const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  cash: {
    id: "cash",
    label: { fr: "Espèces", en: "Cash", ar: "نقداً" },
    instructionsKey: "billing.cash.instructions",
    icon: "💵",
    available: ["XOF", "MAD", "TND", "ETB"],
  },
  wave: {
    id: "wave",
    label: { fr: "Wave", en: "Wave", ar: "ويف" },
    instructionsKey: "billing.wave.instructions",
    icon: "🌊",
    available: ["XOF"],
  },
  orange_money: {
    id: "orange_money",
    label: { fr: "Orange Money", en: "Orange Money", ar: "أورنج موني" },
    instructionsKey: "billing.orange_money.instructions",
    icon: "🟠",
    available: ["XOF"],
  },
  cashplus: {
    id: "cashplus",
    label: { fr: "CashPlus", en: "CashPlus", ar: "كاش بلوس" },
    instructionsKey: "billing.cashplus.instructions",
    icon: "🇲🇦",
    available: ["MAD"],
  },
  wafacash: {
    id: "wafacash",
    label: { fr: "Wafacash", en: "Wafacash", ar: "وفا كاش" },
    instructionsKey: "billing.wafacash.instructions",
    icon: "🇲🇦",
    available: ["MAD"],
  },
  d17: {
    id: "d17",
    label: { fr: "D17 (Poste Tunisienne)", en: "D17", ar: "دي 17" },
    instructionsKey: "billing.d17.instructions",
    icon: "🇹🇳",
    available: ["TND"],
  },
  lapostepay: {
    id: "lapostepay",
    label: { fr: "La Poste Pay", en: "La Poste Pay", ar: "لابوست باي" },
    instructionsKey: "billing.lapostepay.instructions",
    icon: "📮",
    available: ["TND"],
  },
  telebirr: {
    id: "telebirr",
    label: { fr: "Telebirr", en: "Telebirr", ar: "تيلي بير" },
    instructionsKey: "billing.telebirr.instructions",
    icon: "📱",
    available: ["ETB"],
  },
  cbe_birr: {
    id: "cbe_birr",
    label: { fr: "CBE Birr", en: "CBE Birr", ar: "سي بي إي بير" },
    instructionsKey: "billing.cbe_birr.instructions",
    icon: "🏦",
    available: ["ETB"],
  },
  bank_transfer: {
    id: "bank_transfer",
    label: { fr: "Virement bancaire", en: "Bank transfer", ar: "تحويل بنكي" },
    instructionsKey: "billing.bank_transfer.instructions",
    icon: "🏦",
    available: ["XOF", "MAD", "TND", "ETB"],
  },
};

/**
 * Get payment methods available for a given currency.
 */
export function getMethodsForCurrency(currency: SupportedCurrency): PaymentMethod[] {
  return Object.values(PAYMENT_METHODS).filter(m => m.available.includes(currency));
}

/**
 * Get payment methods available for a given list of method IDs.
 */
export function getMethodsById(ids: string[]): PaymentMethod[] {
  return ids.map(id => PAYMENT_METHODS[id]).filter(Boolean);
}
