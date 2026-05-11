/**
 * LIYA Model Coefficients — facturation pondérée
 *
 * Les tokens facturés = tokens réels × coefficient.
 * Haiku est économique (×0.3), Sonnet est la référence (×1),
 * Opus est le modèle puissant (×5).
 *
 * Ces coefficients sont stables et donnent une marge de 88%.
 */

export const MODEL_COEFFICIENTS: Record<string, number> = {
  "claude-haiku-4-5":  0.3,
  "claude-sonnet-4-5": 1.0,
  "claude-opus-4-5":   5.0,
} as const;

export const DEFAULT_COEFFICIENT = 1.0;

/**
 * Calcule les tokens facturés après application du coefficient.
 * Arrondi au supérieur.
 */
export function calculateBilledTokens(
  realTokens: number,
  model: string
): number {
  const coeff = MODEL_COEFFICIENTS[model] ?? DEFAULT_COEFFICIENT;
  return Math.ceil(realTokens * coeff);
}

/**
 * Metadata complète par modèle pour l'UI.
 */
export const MODEL_METADATA = {
  "claude-haiku-4-5": {
    label:       "Haiku",
    icon:        "⚡",
    description: "Rapide & économique",
    coefficient: 0.3,
    coeffLabel:  "×0,3",
    color:       "text-emerald-600",
    bg:          "bg-emerald-50 border-emerald-200",
    activeBg:    "bg-emerald-600 border-emerald-600 text-white",
    note:        "Idéal pour les tâches simples et répétitives",
  },
  "claude-sonnet-4-5": {
    label:       "Sonnet",
    icon:        "✦",
    description: "Équilibré (recommandé)",
    coefficient: 1.0,
    coeffLabel:  "×1",
    color:       "text-aria-indigo",
    bg:          "bg-white border-gray-200",
    activeBg:    "bg-aria-indigo border-aria-indigo text-white",
    note:        "Le meilleur rapport qualité/coût pour la plupart des tâches",
  },
  "claude-opus-4-5": {
    label:       "Opus",
    icon:        "◆",
    description: "Intelligence maximale",
    coefficient: 5.0,
    coeffLabel:  "×5",
    color:       "text-purple-600",
    bg:          "bg-purple-50 border-purple-200",
    activeBg:    "bg-purple-700 border-purple-700 text-white",
    note:        "Analyses complexes, raisonnement avancé — consomme 5× plus de tokens",
  },
} as const;

export type ModelId = keyof typeof MODEL_METADATA;
