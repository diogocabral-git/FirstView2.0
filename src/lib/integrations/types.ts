export type Provider = "shopify" | "meta_ads" | "google_ads" | "gmail";

/** Ligação de uma loja a um fornecedor externo (linha da tabela `integrations`). */
export type IntegrationConnection = {
  id: string;
  storeId: string;
  provider: Provider;
  externalAccountId: string; // ex.: domínio myshopify, ad account id, customer id, email
  accessToken: string;       // desencriptado só no servidor
  refreshToken?: string | null;
  expiresAt?: string | null;
};

export type SyncResult = { provider: Provider; records: number; from: string; to: string };

/** Contrato que cada integração implementa. */
export interface Integration {
  provider: Provider;
  /** URL para onde o utilizador é enviado para autorizar o acesso (OAuth). */
  getAuthorizeUrl(params: { storeId: string; state: string; redirectUri: string; shopDomain?: string }): string;
  /** Troca o código OAuth por tokens e devolve os dados a guardar. */
  handleCallback(params: { code: string; redirectUri: string; shopDomain?: string }): Promise<{
    externalAccountId: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
  }>;
  /** Vai buscar os dados do período e grava-os no Supabase. */
  sync(connection: IntegrationConnection, range: { from: string; to: string }): Promise<SyncResult>;
}

export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`${what}: ainda não implementado`);
  }
}
