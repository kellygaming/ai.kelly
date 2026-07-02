import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Modèle utilisé pour la génération. flux/schnell = rapide et très bon marché
// (idéal pour démarrer). Pour une qualité supérieure une fois que le budget
// le permet, remplace par "fal-ai/flux-pro/v1.1".
const FAL_MODEL = "fal-ai/flux/schnell";

export async function POST(req: Request) {
  try {
    const { prompt, format } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Aucune description reçue." }, { status: 400 });
    }

    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API manquante côté serveur (FAL_KEY)." },
        { status: 500 }
      );
    }

    // Format d'image adapté à TikTok (portrait) ou YouTube (paysage)
    const imageSize = format === "youtube" ? "landscape_16_9" : "portrait_16_9";

    // On enrichit légèrement le prompt pour coller au style miniature gaming
    const fullPrompt = `${prompt.trim()}, miniature gaming accrocheuse, style clickbait, couleurs vives, texte lisible, haute qualité, éclairage dramatique`;

    const response = await fetch(`https://fal.run/${FAL_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: imageSize,
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

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
      return NextResponse.json(
        { error: "Aucune image générée." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: imageUrl });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
