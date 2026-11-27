import { NotImplementedError, type Integration } from "../types";

// Shopify Admin GraphQL API
// Docs: https://shopify.dev/docs/api/admin-graphql
// Dados a sincronizar: orders, refunds, disputes (Shopify Payments), products, variants (custo unitário → COGS).
// Scopes previstos: read_orders, read_products, read_inventory, read_shopify_payments_disputes

const API_VERSION = "2026-10";
const SCOPES = ["read_orders", "read_products", "read_inventory", "read_shopify_payments_disputes"];

export const shopify: Integration = {
  provider: "shopify",

  getAuthorizeUrl({ state, redirectUri, shopDomain }) {
    if (!shopDomain) throw new Error("shopDomain é obrigatório para a Shopify");
    const url = new URL(`https://${shopDomain}/admin/oauth/authorize`);
    url.searchParams.set("client_id", process.env.SHOPIFY_API_KEY!);
    url.searchParams.set("scope", SCOPES.join(","));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async handleCallback({ code, shopDomain }) {
    // TODO: validar HMAC do pedido antes de trocar o código.
    const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    });
    if (!res.ok) throw new Error(`Shopify OAuth falhou: ${res.status}`);
    const data = (await res.json()) as { access_token: string };
    return { externalAccountId: shopDomain!, accessToken: data.access_token };
  },

  async sync() {
    // TODO: consultar orders/refunds via GraphQL (ou Bulk Operations para históricos grandes)
    // em `https://${shop}/admin/api/${API_VERSION}/graphql.json` e fazer upsert em `orders`/`refunds`.
    void API_VERSION;
    throw new NotImplementedError("Shopify sync");
  },
};
