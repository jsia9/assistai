/**
 * Migrate legacy "kamali_*" localStorage keys to "liya_*" keys.
 * Called once on app load from the root layout client component.
 * Safe to call multiple times — idempotent.
 */
export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") return;

  const legacyKeys: string[] = [
    "kamali_model",
    "kamali_locale",
    "kamali_theme",
    "kamali_opus_toast_seen",
  ];

  for (const legacy of legacyKeys) {
    const value = localStorage.getItem(legacy);
    if (value === null) continue; // key doesn't exist, nothing to migrate

    const modern = legacy.replace("kamali_", "liya_");
    // Only migrate if the modern key isn't already set
    if (!localStorage.getItem(modern)) {
      localStorage.setItem(modern, value);
    }
    localStorage.removeItem(legacy);
  }
}
