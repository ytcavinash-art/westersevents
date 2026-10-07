// ============================================================
// WESTERS - SUPABASE CONFIG
// Replace these two values with your Supabase project values.
// Project Settings → API
// NEVER paste a service_role key here.
// ============================================================

export const CONFIG = {
  SUPABASE_URL: "https://krgywnwedbhcqvwlwxnz.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ENdORG90dwjN0JrjAYOJYA_3zUMfarD",
  STORAGE_BUCKET: "westers-media",
  BRAND_NAME: "WESTERS"
};

export function isConfigured() {
  return (
    CONFIG.SUPABASE_URL.startsWith("https://") &&
    !CONFIG.SUPABASE_URL.includes("YOUR_PROJECT_ID") &&
    CONFIG.SUPABASE_ANON_KEY &&
    !CONFIG.SUPABASE_ANON_KEY.includes("YOUR_SUPABASE")
  );
}
