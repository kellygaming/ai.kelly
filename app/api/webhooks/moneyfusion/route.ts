import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (!secret || secret !== process.env.MONEYFUSION_WEBHOOK_SECRET) {
      // Mauvais secret : soit une erreur de config, soit une tentative
      // extérieure — dans les deux cas, on refuse silencieusement.
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const body = await req.json();
    console.log("Webhook MoneyFusion reçu:", JSON.stringify(body));

    const event = body?.event; // "payin.session.pending" | "payin.session.completed" | "payin.session.cancelled"
    const personalInfo = body?.personal_Info?.[0];
    const userId = personalInfo?.userId;

    if (!userId) {
      console.error("Webhook MoneyFusion sans userId:", body);
      return NextResponse.json({ error: "userId manquant." }, { status: 400 });
    }

    // On ne réagit qu'à l'événement de succès. "pending" (répété plusieurs
    // fois pendant le traitement) et "cancelled" ne changent rien au compte.
    if (event !== "payin.session.completed") {
      return NextResponse.json({ ok: true, ignored: true, event });
    }

    const admin = createAdminClient();
    if (!admin) {
      console.error("SUPABASE_SERVICE_ROLE_KEY manquante — impossible de mettre à jour le profil.");
      return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 500 });
    }

    const { error } = await admin
      .from("profiles")
      .update({
        plan: "plus",
        credits_chat: 500,
        credits_miniatures: 20,
        credits_voice: 15,
        credits_reset_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Erreur mise à jour profil après paiement:", error);
      return NextResponse.json({ error: "Échec de la mise à jour du profil." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur webhook MoneyFusion:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
