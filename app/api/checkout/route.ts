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

    const { phone } = await req.json().catch(() => ({ phone: undefined }));
    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { error: "Numéro de téléphone requis pour le paiement." },
        { status: 400 }
      );
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

    // Format officiel FusionPay : chaque entrée d'"article" est un objet où
    // la clé est le nom de l'article et la valeur son prix (pas {nom, montant}).
    const payload = {
      totalPrice: PLUS_PRICE_XOF,
      article: [{ "Abonnement KellyIA Plus — 1 mois": PLUS_PRICE_XOF }],
      numeroSend: phone.trim(),
      nomclient: user.user_metadata?.full_name || user.email || "Client KellyIA",
      personal_Info: [{ userId: user.id, orderId }],
      return_url: `${origin}/chat?upgrade=en_cours`,
      webhook_url: `${origin}/api/webhooks/moneyfusion?secret=${webhookSecret}`,
    };

    // L'URL du dashboard MoneyFusion est le lien API complet, prêt à
    // l'emploi — on ne doit rien y ajouter (doc officielle FusionPay).
    const endpoint = apiUrl.trim();

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
    console.log("Réponse MoneyFusion (checkout):", JSON.stringify(data));

    if (!data?.url) {
      return NextResponse.json(
        {
          error: data?.message
            ? `MoneyFusion : ${data.message}`
            : "Réponse de paiement invalide (voir logs serveur).",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error("Erreur serveur (checkout):", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
