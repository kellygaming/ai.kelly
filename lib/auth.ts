import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export async function signInWithGoogle(next: string = "/chat") {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
}
