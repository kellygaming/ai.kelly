import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM = (
  "Tu améliores un texte destiné à être lu à voix haute par un moteur de synthèse vocale ElevenLabs " +
  "(modèle eleven_v3, qui comprend des tags d'expressivité entre crochets comme [excited], [whispers], " +
  "[laughs], [sighs], [curious], [serious], ainsi que les points de suspension pour les pauses et les " +
  "majuscules pour l'emphase). " +
  "À partir du texte fourni, réécris-le pour qu'il soit vraiment agréable et naturel à entendre une fois lu : " +
  "garde exactement le même sens et la même idée, ne change pas le fond du message ; ajoute au maximum un ou " +
  "deux tags d'expressivité, seulement là où c'est pertinent et cohérent avec le ton du texte, sans en abuser ; " +
  "ajuste la ponctuation et le rythme pour une lecture fluide ; corrige les fautes et lourdeurs éventuelles. " +
  "Réponds uniquement avec le texte final, sans préambule, sans guillemets, sans markdown, dans la même langue " +
  "que le texte d'origine."
);

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Aucun texte reçu." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API manquante côté serveur (ANTHROPIC_API_KEY)." },
        { status: 500 }
      );
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
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: text.trim() }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API Anthropic (enhance-voice-text):", errText);
      return NextResponse.json({ error: "Erreur lors de l'amélioration du texte." }, { status: 502 });
    }

    const data = await response.json();
    const enhanced =
      data?.content?.find((c: { type: string }) => c.type === "text")?.text?.trim() ?? "";

    if (!enhanced) {
      return NextResponse.json({ error: "Aucune amélioration générée." }, { status: 502 });
    }

    return NextResponse.json({ text: enhanced });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
