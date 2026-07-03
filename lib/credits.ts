import { createClient } from "@/lib/supabase/server";

export type CreditType = "miniature" | "voice";

export type CreditCheckResult = {
  ok: boolean;
  reason?: "not_configured" | "not_authenticated" | "no_credits" | "unknown";
  plan?: string;
  creditsRemaining?: number;
};

/**
 * Vérifie et décompte un crédit pour l'utilisateur connecté.
 *
 * Tant que Supabase n'est pas configuré (variables d'environnement absentes),
 * on laisse passer sans restriction — utile pendant le développement, avant
 * que la connexion et les tables soient en place.
 */
export async function checkAndConsumeCredit(type: CreditType): Promise<CreditCheckResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: true, plan: "gratuit", creditsRemaining: Infinity };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_authenticated" };
  }

  const { data, error } = await supabase.rpc("consume_credit", { credit_type: type });

  if (error || !data) {
    console.error("Erreur consume_credit:", error);
    return { ok: false, reason: "unknown" };
  }

  const result = data as {
    ok: boolean;
    error?: string;
    plan: string;
    credits_miniatures: number;
    credits_voice: number;
  };

  if (!result.ok) {
    return { ok: false, reason: "no_credits", plan: result.plan };
  }

  const creditsRemaining = type === "miniature" ? result.credits_miniatures : result.credits_voice;
  return { ok: true, plan: result.plan, creditsRemaining };
}
