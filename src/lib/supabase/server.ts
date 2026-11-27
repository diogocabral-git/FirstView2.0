import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Cliente Supabase para Server Components, Server Actions e Route Handlers (sessão do utilizador). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component: o proxy trata da renovação da sessão.
        }
      },
    },
  });
}

/**
 * Cliente com a service role key. Ignora RLS: usar APENAS no servidor
 * (cron de sincronização, callbacks OAuth). Nunca expor ao browser.
 */
export function createServiceClient() {
  return createAdminClient(supabaseUrl!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
