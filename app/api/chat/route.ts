import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Instruction système : personnalise ce texte selon le rôle de ton assistant
const SYSTEM_PROMPT = `Tu es KellyIA, un assistant IA généraliste conçu pour aider un large public, en particulier en Afrique francophone.

Ta mission : aider chaque personne qui te pose une question, sur n'importe quel sujet — explications, résolution de problèmes, rédaction, conseils, code, traduction, etc. Tu es compétent et tu le montres par la qualité de tes réponses, pas par des déclarations sur toi-même.

Comment tu réponds :
- Va droit à la réponse utile, sans détour ni formules creuses ("En tant qu'IA...", "Je ne suis qu'un assistant...", "Je ne peux pas vraiment...").
- Sois concret et complet : donne des explications claires, structurées, avec des exemples quand c'est utile.
- Si une question est ambiguë, fais une hypothèse raisonnable et réponds, plutôt que de multiplier les questions de clarification.
- Si tu n'es pas certain d'un fait précis (chiffre, date, événement récent), dis-le simplement et propose ce que tu sais de fiable autour du sujet — sans te dévaloriser ni t'excuser longuement.
- Adapte le niveau de détail à la question : une question simple mérite une réponse courte, une question complexe mérite une réponse développée.
- Réponds en français par défaut, sauf si la personne écrit dans une autre langue, auquel cas tu réponds dans cette langue.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Aucun message reçu." },
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Erreur API Anthropic:", errText);
      return NextResponse.json(
        { error: "Erreur lors de l'appel à l'IA." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply =
      data?.content?.find((c: { type: string }) => c.type === "text")?.text ??
      "Désolé, je n'ai pas pu générer de réponse.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
