import { prisma } from "@/lib/prisma";
import { COUNTRIES, getCountry, type CountryConfig } from "@/lib/regions";

export interface TenantContext {
  tenant: {
    id: string;
    name: string;
    plan: string;
    active: boolean;
    monthlyTokenLimit: number;
    systemPrompt: string | null;
    country: string | null;
    region: string;
    countryCode: string;
    currency: string;
    defaultLocale: string;
    timezone: string;
  };
  country: CountryConfig;
}

export async function getTenantContext(tenantId: string): Promise<TenantContext> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  const countryCode = (tenant as { countryCode?: string }).countryCode ?? tenant.country ?? "SN";
  const country = getCountry(countryCode);

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      active: tenant.active,
      monthlyTokenLimit: tenant.monthlyTokenLimit,
      systemPrompt: tenant.systemPrompt ?? null,
      country: tenant.country ?? null,
      region: (tenant as { region?: string }).region ?? country.region,
      countryCode,
      currency: (tenant as { currency?: string }).currency ?? country.currency,
      defaultLocale: (tenant as { defaultLocale?: string }).defaultLocale ?? country.defaultLocale,
      timezone: (tenant as { timezone?: string }).timezone ?? country.timezone,
    },
    country,
  };
}
