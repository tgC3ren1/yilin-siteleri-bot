// frontend/supabaseClient.js

// 🔑 Supabase proje ayarların (Dashboard → Settings → API)
window.SUPABASE_URL = "https://hmewekdwyoypvwklzkhz.supabase.co";
window.SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtZXdla2R3eW95cHZ3a2x6a2h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMTQwOTIsImV4cCI6MjA3MTc5MDA5Mn0.nI1nLM3dAhMA0HvG9S5Geiw8iU--O63oQk6rCCQznjk";

// 🌐 Edge Functions base URL (public endpoint) — sonda "/" YOK
window.EDGE_BASE = "https://hmewekdwyoypvwklzkhz.functions.supabase.co";

// (İsteğe bağlı) supabase-js kullanacaksan aşağıdaki 2 satırı aç:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> dosyası yüklüyse:
// const { createClient } = window.supabase;
// window.sb = createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
