import { createBrowserClient } from "@supabase/ssr";
import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_NOT_CONFIGURED,
  SUPABASE_URL,
} from "./config";

export function createClient() {
  if (!isSupabaseConfigured()) throw new Error(SUPABASE_NOT_CONFIGURED);
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
