import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const looksReal = (v?: string) => !!v && !v.includes("YOUR-");

/** True only when real (non-placeholder) public credentials are present. Only the anon key is ever used client-side. */
export const isSupabaseConfigured = looksReal(url) && looksReal(anon);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anon!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
