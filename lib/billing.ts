/**
 * Constantes et utilitaires de facturation AssistAI
 * Devise principale : FCFA (XOF)
 */

/** Taux de change indicatif (non contractuel) */
export const FCFA_PER_USD = 600;

/** Prix mensuel de chaque offre en FCFA */
export const PLAN_PRICE_FCFA: Record<string, number> = {
  starter: 25_000,
  pro: 75_000,
  enterprise: 150_000,
};

/** Tokens inclus dans chaque offre de base */
export const PLAN_TOKENS: Record<string, number> = {
  starter: 500_000,
  pro: 2_000_000,
  enterprise: 5_000_000,
};

/**
 * Recharge de tokens :
 * 10 000 FCFA → 200 000 tokens supplémentaires
 */
export const TOPUP_FCFA = 10_000;
export const TOPUP_TOKENS = 200_000;

/** Convertit FCFA en USD (arrondi 2 décimales) */
export function fcfaToUsd(fcfa: number): number {
  return Math.round((fcfa / FCFA_PER_USD) * 100) / 100;
}

/** Convertit USD en FCFA */
export function usdToFcfa(usd: number): number {
  return Math.round(usd * FCFA_PER_USD);
}

/** Formate un montant en FCFA */
export function fmtFcfa(fcfa: number): string {
  return `${fcfa.toLocaleString("fr-FR")} FCFA`;
}

/** Formate un montant en USD */
export function fmtUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

/** Affiche FCFA + USD entre parenthèses */
export function fmtBoth(fcfa: number): string {
  return `${fmtFcfa(fcfa)} (${fmtUsd(fcfaToUsd(fcfa))})`;
}

/** Période courante au format "2026-05" */
export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Calcule les tokens ajoutés pour un montant FCFA de recharge */
export function tokensForTopup(amountFcfa: number): number {
  return Math.floor(amountFcfa / TOPUP_FCFA) * TOPUP_TOKENS;
}
