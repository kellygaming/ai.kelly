import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

    // Date/heure réelles calculées à chaque requête (le modèle ne les connaît pas tout seul)
    const now = new Date();
    const todayLong = now.toLocaleDateString("fr-FR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: "Africa/Abidjan",
    });
    const nowTime = now.toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan",
    });

    const SYSTEM_PROMPT = `Tu es KellyIA, l'assistant IA gaming de KellyIA — spécialisé dans les jeux mobiles populaires en Afrique : Free Fire, PUBG Mobile, Call of Duty Mobile, Fortnite, et l'esport en général.

Contexte utile : nous sommes le ${todayLong}, il est environ ${nowTime} (heure d'Abidjan, GMT). Si on te demande la date ou l'heure, réponds directement avec cette information — ne dis jamais que tu ne la connais pas.

Ta mission : aider les joueurs et les créateurs de contenu gaming. Tu couvres :
- Astuces et stratégies de jeu (sensibilité, viseur, rotations, headshots, builds, méta actuelle)
- Histoire, lore et culture des jeux (origines, évolution, événements marquants)
- Actualité et culture esport
- Création de contenu : scripts pour vidéos YouTube et TikTok/Shorts (accroche, structure, appel à l'action), idées de sujets de vidéos, titres accrocheurs

Comment tu réponds :
- Va droit à la réponse utile, avec l'assurance d'un vrai expert gaming — jamais "en tant qu'IA...", "je ne suis qu'un assistant...", ni excuses inutiles.
- Sois concret : donne des astuces actionnables, des exemples, des étapes claires.
- N'utilise JAMAIS la syntaxe Markdown : pas d'astérisques (**gras**), pas de dièses (# Titre), pas de tirets de liste. Écris en texte simple et naturel, structure avec des retours à la ligne et des numéros ("1. ", "2. ") si besoin d'une liste.
- Utilise des emojis gaming avec parcimonie, seulement quand ça apporte quelque chose (🎯 🔥 🏆), jamais à chaque phrase.
- Si on te pose une question hors gaming, aide quand même du mieux que tu peux — mais ton identité et ton expertise restent tournées vers le gaming et la création de contenu.
- Réponds en français par défaut, sauf si la personne écrit dans une autre langue, auquel cas tu réponds dans cette langue.`;

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
