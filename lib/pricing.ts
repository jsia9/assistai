export type SupportedCurrency = "XOF" | "MAD" | "TND" | "ETB";

export interface PricingTier {
  plan: "starter" | "pro" | "enterprise";
  amount: number;
  tokenLimit: number;
}

export interface RegionPricing {
  currency: SupportedCurrency;
  /** Local-currency units per USD — for display only */
  usdRate: number;
  tiers: PricingTier[];
  topUp: { amount: number; tokens: number };
  /** Short-form currency symbol for display */
  symbol: string;
  /** Ethiopian Birr prices are reviewed quarterly — show notice */
  birr_notice?: boolean;
}

export const PRICING: Record<SupportedCurrency, RegionPricing> = {
  XOF: {
    currency: "XOF",
    usdRate: 600,
    symbol: "FCFA",
    tiers: [
      { plan: "starter",    amount: 25_000,  tokenLimit: 500_000 },
      { plan: "pro",        amount: 75_000,  tokenLimit: 2_000_000 },
      { plan: "enterprise", amount: 150_000, tokenLimit: 5_000_000 },
    ],
    topUp: { amount: 10_000, tokens: 200_000 },
  },
  MAD: {
    currency: "MAD",
    usdRate: 10,
    symbol: "DH",
    tiers: [
      { plan: "starter",    amount: 400,   tokenLimit: 500_000 },
      { plan: "pro",        amount: 1_200, tokenLimit: 2_000_000 },
      { plan: "enterprise", amount: 2_500, tokenLimit: 5_000_000 },
    ],
    topUp: { amount: 150, tokens: 200_000 },
  },
  TND: {
    currency: "TND",
    usdRate: 3,
    symbol: "DT",
    tiers: [
      { plan: "starter",    amount: 120, tokenLimit: 500_000 },
      { plan: "pro",        amount: 360, tokenLimit: 2_000_000 },
      { plan: "enterprise", amount: 750, tokenLimit: 5_000_000 },
    ],
    topUp: { amount: 45, tokens: 200_000 },
  },
  ETB: {
    currency: "ETB",
    usdRate: 160,
    symbol: "ETB",
    birr_notice: true,
    tiers: [
      { plan: "starter",    amount: 6_500,  tokenLimit: 500_000 },
      { plan: "pro",        amount: 19_500, tokenLimit: 2_000_000 },
      { plan: "enterprise", amount: 40_000, tokenLimit: 5_000_000 },
    ],
    topUp: { amount: 2_500, tokens: 200_000 },
  },
};

/** Calculate how many tokens a given amount buys in a currency */
export function calcTopUpTokens(amount: number, currency: SupportedCurrency): number {
  const { topUp } = PRICING[currency];
  return Math.floor((amount / topUp.amount) * topUp.tokens);
}

/** Get approximate USD equivalent for display */
export function toUsd(amount: number, currency: SupportedCurrency): number {
  return Math.round(amount / PRICING[currency].usdRate);
}
