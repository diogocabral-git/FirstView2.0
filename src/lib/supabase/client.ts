import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

/** Cliente Supabase para componentes do browser ("use client"). */
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}
