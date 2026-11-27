import { NextResponse } from "next/server";
import { getIntegration } from "@/lib/integrations";

// GET /api/integrations/shopify/connect?storeId=...&shop=loja.myshopify.com
// Inicia o fluxo OAuth do fornecedor.
export async function GET(request: Request, ctx: RouteContext<"/api/integrations/[provider]/connect">) {
  const { provider } = await ctx.params;
  const integration = getIntegration(provider);
  if (!integration) return NextResponse.json({ error: "Fornecedor desconhecido" }, { status: 404 });

  const url = new URL(request.url);
  const storeId = url.searchParams.get("storeId");
  if (!storeId) return NextResponse.json({ error: "storeId em falta" }, { status: 400 });

  // TODO: gerar `state` aleatório, guardá-lo num cookie httpOnly e validá-lo no callback.
  const state = crypto.randomUUID();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/${provider}/callback`;

  const authorizeUrl = integration.getAuthorizeUrl({
    storeId,
    state,
    redirectUri,
    shopDomain: url.searchParams.get("shop") ?? undefined,
  });

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set("oauth_state", JSON.stringify({ state, storeId }), { httpOnly: true, secure: true, maxAge: 600, path: "/" });
  return res;
}
