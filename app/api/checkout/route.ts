import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PLUS_PRICE_XOF = 2500;

export async function POST(req: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "La connexion n'est pas encore configurée côté serveur." },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Connecte-toi d'abord." }, { status: 401 });
    }

    const apiUrl = process.env.MONEYFUSION_API_URL;
    const webhookSecret = process.env.MONEYFUSION_WEBHOOK_SECRET;
    if (!apiUrl || !webhookSecret) {
      return NextResponse.json(
        { error: "Paiement pas encore configuré côté serveur." },
        { status: 500 }
      );
    }

    const origin = new URL(req.url).origin;
    const orderId = crypto.randomUUID();

    const payload = {
      totalPrice: PLUS_PRICE_XOF,
      article: [{ nom: "Abonnement KellyIA Plus — 1 mois", montant: PLUS_PRICE_XOF }],
      personal_Info: [{ userId: user.id, orderId }],
      nomclient: user.user_metadata?.full_name || user.email || "Client KellyIA",
      return_url: `${origin}/chat?upgrade=en_cours`,
      webhook_url: `${origin}/api/webhooks/moneyfusion?secret=${webhookSecret}`,
    };

    // On normalise l'URL : que MONEYFUSION_API_URL se termine déjà par
    // "/pay/" (comme fourni par le dashboard) ou non, on n'ajoute jamais
    // "/pay/" en double.
    const normalizedApiUrl = apiUrl.replace(/\/+$/, ""); // enlève les / finaux
    const endpoint = normalizedApiUrl.endsWith("/pay")
      ? `${normalizedApiUrl}/`
      : `${normalizedApiUrl}/pay/`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur MoneyFusion (checkout):", endpoint, errText);
      return NextResponse.json(
        { error: "Impossible de démarrer le paiement pour le moment." },
        { status: 502 }
      );
    }

    const data = await response.json();
    if (!data?.url) {
      console.error("Réponse MoneyFusion inattendue:", data);
      return NextResponse.json({ error: "Réponse de paiement invalide." }, { status: 502 });
    }

    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error("Erreur serveur (checkout):", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
