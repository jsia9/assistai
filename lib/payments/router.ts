import type { PaymentProvider } from "./types";
import { PaymentsDisabledError } from "./types";
import { cinetPayProvider } from "./providers/cinetpay";
import { orangeMoneyMaliProvider } from "./providers/orange-money-mali";

/** Map ISO 3166-1 alpha-2 country codes to provider names */
const COUNTRY_PROVIDER_MAP: Record<string, string> = {
  ML: "orange-money-mali", // Mali → Orange Money direct
  BF: "cinetpay",          // Burkina Faso
  NE: "cinetpay",          // Niger
  GN: "cinetpay",          // Guinée
  SN: "cinetpay",          // Sénégal (PayDunya later)
  CI: "cinetpay",          // Côte d'Ivoire
  TG: "cinetpay",          // Togo
  BJ: "cinetpay",          // Bénin
  CM: "cinetpay",          // Cameroun
};

const PROVIDERS: Record<string, PaymentProvider> = {
  cinetpay: cinetPayProvider,
  "orange-money-mali": orangeMoneyMaliProvider,
  // paydunya: paydunyaProvider,  // add here when ready
};

interface TenantRouterContext {
  country?: string | null;
  preferredProvider?: string | null;
}

export function getProvider(tenant: TenantRouterContext): PaymentProvider {
  if (process.env.PAYMENTS_ENABLED === "false") {
    throw new PaymentsDisabledError();
  }

  // 1. Explicit preference
  if (tenant.preferredProvider && PROVIDERS[tenant.preferredProvider]) {
    return PROVIDERS[tenant.preferredProvider];
  }

  // 2. Country-based routing
  const countryKey = tenant.country?.toUpperCase() ?? "ML";
  const providerName = COUNTRY_PROVIDER_MAP[countryKey] ?? "cinetpay";
  const provider = PROVIDERS[providerName];

  if (!provider) {
    // Fallback — should never happen as long as cinetpay is registered
    return cinetPayProvider;
  }

  return provider;
}

/**
 * Look up a provider by its name string.
 * Used by the webhook route to dispatch to the correct provider
 * based on the `?provider=` query param.
 */
export function getProviderByName(name: string): PaymentProvider | null {
  return PROVIDERS[name] ?? null;
}
