export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Enquanto o Supabase não estiver configurado, a app corre em modo demo (dados de exemplo, sem login). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
