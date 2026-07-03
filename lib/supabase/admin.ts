import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé service_role : contourne les policies RLS.
 * À utiliser UNIQUEMENT dans du code serveur (routes API), jamais côté
 * navigateur. Sert au webhook de paiement, qui doit mettre à jour le profil
 * d'un utilisateur sans que celui-ci soit "connecté" au moment de l'appel
 * (l'appel vient du serveur de MoneyFusion, pas du navigateur du client).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
