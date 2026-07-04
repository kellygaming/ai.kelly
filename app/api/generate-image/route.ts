import { NextResponse } from "next/server";
import { checkAndConsumeCredit } from "@/lib/credits";

export const runtime = "nodejs";

// Sans image de référence : Flux Dev (meilleure qualité que Schnell, toujours abordable).
const FAL_TEXT_MODEL = "fal-ai/flux/dev";
// Avec image de référence : Kontext, conçu pour transformer une image existante
// en respectant sa composition — bien plus fidèle qu'un prompt texte seul.
const FAL_KONTEXT_MODEL = "fal-ai/flux-pro/kontext";

export async function POST(req: Request) {
  try {
    const { prompt, format, imageDataUrl } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Aucune description reçue." }, { status: 400 });
    }

    const credit = await checkAndConsumeCredit("miniature");
    if (!credit.ok) {
      if (credit.reason === "not_authenticated") {
        return NextResponse.json(
          { error: "Connecte-toi pour générer des miniatures.", code: "not_authenticated" },
          { status: 401 }
        );
      }
      if (credit.reason === "no_credits") {
        return NextResponse.json(
          {
            error:
              credit.plan === "plus"
                ? "Crédits miniatures épuisés pour ce mois-ci."
                : "Crédits miniatures gratuits épuisés — passe à l'offre Plus pour continuer.",
            code: "no_credits",
          },
          { status: 402 }
        );
      }
      return NextResponse.json({ error: "Erreur de vérification des crédits." }, { status: 500 });
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API manquante côté serveur (FAL_KEY)." },
        { status: 500 }
      );
    }

    const imageSize = format === "youtube" ? "landscape_16_9" : "portrait_16_9";
    const stylePrompt = `${prompt.trim()}, miniature gaming accrocheuse, style clickbait, couleurs vives, texte lisible, haute qualité, éclairage dramatique`;

    let response: Response;

    if (imageDataUrl && typeof imageDataUrl === "string") {
      // Mode "image de référence" : Kontext transforme l'image fournie
      response = await fetch(`https://fal.run/${FAL_KONTEXT_MODEL}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: stylePrompt,
          image_url: imageDataUrl,
          aspect_ratio: format === "youtube" ? "16:9" : "9:16",
        }),
      });
    } else {
      // Mode texte seul
      response = await fetch(`https://fal.run/${FAL_TEXT_MODEL}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: stylePrompt,
          image_size: imageSize,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API fal.ai:", errText);
      return NextResponse.json(
        { error: "Erreur lors de la génération de l'image." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const imageUrl = data?.images?.[0]?.url;

    if (!imageUrl) {
      return NextResponse.json({ error: "Aucune image générée." }, { status: 502 });
    }

    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}

