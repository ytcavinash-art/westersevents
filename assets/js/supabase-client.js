import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { CONFIG, isConfigured } from "./config.js";

if (!isConfigured()) {
  console.warn("WESTERS: Add your Supabase URL and public key in assets/js/config.js");
}

export const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export { CONFIG, isConfigured };
