import { NextResponse } from "next/server";
import { integrations, type IntegrationConnection } from "@/lib/integrations";
import { createServiceClient } from "@/lib/supabase/server";

// Chamado de hora a hora pelo Vercel Cron (ver vercel.json).
// Para cada ligação ativa, sincroniza os últimos 3 dias (para apanhar correções e reembolsos).
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from("integrations")
    .select("id, store_id, provider, external_account_id, access_token, refresh_token, expires_at")
    .eq("status", "connected");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const to = new Date();
  const from = new Date(to.getTime() - 3 * 24 * 60 * 60 * 1000);
  const range = { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };

  const results = await Promise.allSettled(
    (rows ?? []).map(async (row) => {
      const connection: IntegrationConnection = {
        id: row.id,
        storeId: row.store_id,
        provider: row.provider,
        externalAccountId: row.external_account_id,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        expiresAt: row.expires_at,
      };
      const result = await integrations[connection.provider].sync(connection, range);
      await supabase.from("integrations").update({ last_synced_at: new Date().toISOString() }).eq("id", row.id);
      return result;
    }),
  );

  return NextResponse.json({
    range,
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) })),
  });
}
