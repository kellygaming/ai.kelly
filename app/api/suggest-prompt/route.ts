import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { imageDataUrl, idea } = await req.json();

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json({ error: "Aucune image reçue." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API manquante côté serveur (ANTHROPIC_API_KEY)." },
        { status: 500 }
      );
    }

    // On extrait le type mime et les données base64 du data URL
    const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Format d'image invalide." }, { status: 400 });
    }
    const [, mediaType, base64Data] = match;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 300,
        system:
          "Tu aides à rédiger des instructions de transformation d'image pour un outil de génération IA (FLUX Kontext) qui crée des miniatures gaming pour YouTube/TikTok. " +
          "À partir de l'image fournie et de l'idée de l'utilisateur, rédige UNE SEULE instruction claire, précise et concrète, en français, en une ou deux phrases maximum. " +
          "Décris ce qui doit changer (texte à ajouter, couleurs, ambiance, effets) et ce qui doit rester identique (sujet, composition). " +
          "Réponds uniquement avec l'instruction elle-même, sans préambule, sans guillemets, sans markdown.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              },
              {
                type: "text",
                text: idea?.trim()
                  ? `Idée de l'utilisateur pour cette miniature : ${idea.trim()}`
                  : "L'utilisateur n'a pas précisé d'idée : propose une transformation qui rendrait cette image efficace comme miniature gaming accrocheuse.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API Anthropic (vision):", errText);
      return NextResponse.json(
        { error: "Erreur lors de l'analyse de l'image." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const suggestion =
      data?.content?.find((c: { type: string }) => c.type === "text")?.text?.trim() ?? "";

    if (!suggestion) {
      return NextResponse.json({ error: "Aucune suggestion générée." }, { status: 502 });
    }

    return NextResponse.json({ prompt: suggestion });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
