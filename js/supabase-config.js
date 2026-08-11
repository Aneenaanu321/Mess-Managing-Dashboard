/* ==========================================================================
   Supabase config — free cloud Postgres for Mess Manager
   Project: Mess Managing App
   ========================================================================== */

const SupabaseConfig = {
  url: "https://pmfoflxkceksbtqsutmq.supabase.co",
  // Use the anon (public) JWT key with the JS client
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtZm9mbHhrY2Vrc2J0cXN1dG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjM5ODYsImV4cCI6MjEwMTkzOTk4Nn0.8gP7ScisJvyTRCOaXgAixOt1baZZMoK55Dky4U9LQp0",
};

function isSupabaseConfigured() {
  return !!(
    SupabaseConfig.url &&
    SupabaseConfig.anonKey &&
    !SupabaseConfig.url.includes("PASTE_") &&
    !SupabaseConfig.anonKey.includes("PASTE_")
  );
}
