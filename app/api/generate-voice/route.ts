import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Chaque personnage de voix pointe vers une variable d'environnement contenant
// le Voice ID ElevenLabs correspondant (à choisir dans la Voice Library).
const VOICE_ENV_MAP: Record<string, string | undefined> = {
  kelly: process.env.ELEVENLABS_VOICE_KELLY,
  aicha: process.env.ELEVENLABS_VOICE_AICHA,
  yao: process.env.ELEVENLABS_VOICE_YAO,
  fatou: process.env.ELEVENLABS_VOICE_FATOU,
};

export async function POST(req: Request) {
  try {
    const { text, voiceKey } = await req.json();

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Aucun texte reçu." }, { status: 400 });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Clé API manquante côté serveur (ELEVENLABS_API_KEY)." },
        { status: 500 }
      );
    }

    const voiceId = VOICE_ENV_MAP[voiceKey] || VOICE_ENV_MAP.kelly;
    if (!voiceId) {
      return NextResponse.json(
        { error: "Aucun Voice ID configuré (ex: ELEVENLABS_VOICE_KELLY)." },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.8 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API ElevenLabs:", errText);
      return NextResponse.json(
        { error: "Erreur lors de la génération de la voix." },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
