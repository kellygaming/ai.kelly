import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Démarre le passage à l'offre Plus.
 * - Si l'utilisateur n'est pas connecté : lance la connexion Google, avec un
 *   retour automatique vers le paiement une fois reconnecté.
 * - Si déjà connecté : appelle directement /api/checkout et redirige vers
 *   la page de paiement MoneyFusion.
 */
export async function startUpgrade(): Promise<{ error?: string }> {
  if (!isSupabaseConfigured()) {
    return { error: "La connexion n'est pas encore configurée." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/chat?upgrade=1` },
    });
    return {};
  }

  try {
    const phone = window.prompt(
      "Ton numéro de téléphone Mobile Money (Wave, Orange, MTN...) pour le paiement :"
    );
    if (!phone || !phone.trim()) {
      return { error: "Numéro de téléphone requis pour continuer." };
    }

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phone.trim() }),
    });
    const data = await res.json();
    if (!res.ok || !data?.url) {
      return { error: data?.error || "Impossible de démarrer le paiement." };
    }
    window.location.href = data.url;
    return {};
  } catch {
    return { error: "Impossible de contacter le serveur." };
  }
}
