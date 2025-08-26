// Buradaki 3 satırı kendi Supabase bilgilerinle doldur
window.SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
window.EDGE_BASE = "https://YOUR-PROJECT.functions.supabase.co";

const { createClient } = window.supabase;
window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
