import { NextResponse } from "next/server";

export const runtime = "nodejs";

const VISION_SYSTEM =
  "Tu aides à rédiger des instructions de transformation d'image pour un outil de génération IA (FLUX Kontext) qui crée des miniatures gaming pour YouTube/TikTok. " +
  "À partir de l'image fournie et de l'idée de l'utilisateur, rédige UNE SEULE instruction claire, précise et concrète, en français, en une ou deux phrases maximum. " +
  "Décris ce qui doit changer (texte à ajouter, couleurs, ambiance, effets) et ce qui doit rester identique (sujet, composition). " +
  "Réponds uniquement avec l'instruction elle-même, sans préambule, sans guillemets, sans markdown.";

const TEXT_SYSTEM =
  "Tu transformes une idée brève en un excellent prompt pour un outil de génération d'images IA (FLUX) qui crée des miniatures gaming pour YouTube/TikTok. " +
  "Un bon prompt de miniature gaming précise : le sujet et l'action, la composition (cadrage, premier plan/arrière-plan), " +
  "l'ambiance lumineuse (néon, dramatique, contrastée...), la palette de couleurs, le style visuel (clickbait, réaliste, stylisé), " +
  "et si pertinent le texte à afficher sur l'image et son style (gros, impactant, contrasté). " +
  "À partir de l'idée de l'utilisateur, réécris-la en un prompt riche et concret en français, en 2-3 phrases maximum. " +
  "Réponds uniquement avec le prompt lui-même, sans préambule, sans guillemets, sans markdown.";

export async function POST(req: Request) {
  try {
    const { imageDataUrl, idea } = await req.json();

    const hasImage = typeof imageDataUrl === "string" && imageDataUrl.length > 0;
    const hasIdea = typeof idea === "string" && idea.trim().length > 0;

    if (!hasImage && !hasIdea) {
      return NextResponse.json(
        { error: "Écris au moins une idée, ou dépose une image de référence." },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API manquante côté serveur (ANTHROPIC_API_KEY)." },
        { status: 500 }
      );
    }

    let system: string;
    let userContent: unknown;

    if (hasImage) {
      const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      if (!match) {
        return NextResponse.json({ error: "Format d'image invalide." }, { status: 400 });
      }
      const [, mediaType, base64Data] = match;

      system = VISION_SYSTEM;
      userContent = [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
        {
          type: "text",
          text: hasIdea
            ? `Idée de l'utilisateur pour cette miniature : ${idea.trim()}`
            : "L'utilisateur n'a pas précisé d'idée : propose une transformation qui rendrait cette image efficace comme miniature gaming accrocheuse.",
        },
      ];
    } else {
      system = TEXT_SYSTEM;
      userContent = `Idée de l'utilisateur : ${idea.trim()}`;
    }

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
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API Anthropic (suggest-prompt):", errText);
      return NextResponse.json({ error: "Erreur lors de l'amélioration du prompt." }, { status: 502 });
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
