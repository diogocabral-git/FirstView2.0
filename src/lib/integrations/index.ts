import type { Integration, Provider } from "./types";
import { shopify } from "./shopify";
import { metaAds } from "./meta-ads";
import { googleAds } from "./google-ads";
import { gmail } from "./gmail";

export const integrations: Record<Provider, Integration> = {
  shopify,
  meta_ads: metaAds,
  google_ads: googleAds,
  gmail,
};

/** Converte o segmento do URL (ex.: "meta-ads") no fornecedor. */
export function getIntegration(slug: string): Integration | undefined {
  return integrations[slug.replace(/-/g, "_") as Provider];
}

export * from "./types";
