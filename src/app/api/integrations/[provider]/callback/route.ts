import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIntegration } from "@/lib/integrations";
import { createServiceClient } from "@/lib/supabase/server";

// Recebe o retorno do OAuth, troca o código por tokens e guarda a ligação.
export async function GET(request: Request, ctx: RouteContext<"/api/integrations/[provider]/callback">) {
  const { provider } = await ctx.params;
  const integration = getIntegration(provider);
  if (!integration) return NextResponse.json({ error: "Fornecedor desconhecido" }, { status: 404 });

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const cookieStore = await cookies();
  const saved = JSON.parse(cookieStore.get("oauth_state")?.value ?? "{}") as { state?: string; storeId?: string };

  if (!code || !saved.state || saved.state !== url.searchParams.get("state")) {
    return NextResponse.json({ error: "Pedido OAuth inválido" }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/callback`;
  const tokens = await integration.handleCallback({
    code,
    redirectUri,
    shopDomain: url.searchParams.get("shop") ?? undefined,
  });

  // TODO: encriptar os tokens (ex.: Supabase Vault ou AES com INTEGRATIONS_ENCRYPTION_KEY) antes de gravar.
  const supabase = createServiceClient();
  const { error } = await supabase.from("integrations").upsert(
    {
      store_id: saved.storeId,
      provider: integration.provider,
      external_account_id: tokens.externalAccountId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? null,
      expires_at: tokens.expiresAt ?? null,
      status: "connected",
    },
    { onConflict: "store_id,provider,external_account_id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  cookieStore.delete("oauth_state");
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations`);
}
