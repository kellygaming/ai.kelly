import { NextResponse } from "next/server";
import { checkAndConsumeCredit } from "@/lib/credits";

export const runtime = "nodejs";

type ChatMsg = { role: string; content: string };

// Relaie un flux SSE (Anthropic ou DeepSeek/OpenAI) vers le client sous forme
// de texte brut : chaque morceau de réponse arrive dès qu'il est généré, au
// lieu d'attendre la réponse complète. `extractText` isole le texte selon le
// format SSE propre à chaque fournisseur.
function streamPlainText(body: ReadableStream<Uint8Array>, extractText: (parsed: any) => string | null) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const evt of events) {
            const dataLine = evt.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const raw = dataLine.slice(6);
            if (raw === "[DONE]") continue;
            try {
              const text = extractText(JSON.parse(raw));
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // ligne non-JSON (keep-alive, etc.) : on ignore
            }
          }
        }
      } catch (streamErr) {
        console.error("Erreur de streaming:", streamErr);
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Aucun message reçu." }, { status: 400 });
    }

    const credit = await checkAndConsumeCredit("chat");
    if (!credit.ok) {
      if (credit.reason === "not_authenticated") {
        return NextResponse.json(
          { error: "Connecte-toi pour discuter avec KellyIA.", code: "not_authenticated" },
          { status: 401 }
        );
      }
      if (credit.reason === "no_credits") {
        return NextResponse.json(
          {
            error:
              credit.plan === "plus"
                ? "Crédits chat épuisés pour ce mois-ci."
                : "Crédits chat gratuits épuisés — passe à l'offre Plus pour continuer avec notre modèle IA Pro 3.1, plus intelligent et plus performant.",
            code: "no_credits",
          },
          { status: 402 }
        );
      }
      return NextResponse.json({ error: "Erreur de vérification des crédits." }, { status: 500 });
    }

    // Plan Plus → Claude (Anthropic), plan gratuit → DeepSeek : même
    // comportement et même prompt côté utilisateur, seul le modèle change.
    const usesClaude = credit.plan === "plus";

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

Cas particulier — réglages de sensibilité Free Fire : c'est ta spécialité la plus demandée, traite-la comme un vrai coach professionnel, jamais avec des valeurs génériques et vagues. Donne directement une sensi complète et cohérente (Général, Red Dot, 2x, 4x, Sniper/AWM, Free Look), avec l'assurance d'un pro — sans interroger l'utilisateur ni le faire attendre. Si l'utilisateur a mentionné son téléphone dans la conversation, affine tes valeurs en conséquence ; sinon donne une config solide et polyvalente qui marche bien sur la plupart des appareils.

Comment tu réponds :
- Va droit à la réponse utile, avec l'assurance d'un vrai expert gaming — jamais "en tant qu'IA...", "je ne suis qu'un assistant...", ni excuses inutiles.
- Sois concret : donne des astuces actionnables, des exemples, des étapes claires.
- N'utilise JAMAIS la syntaxe Markdown : pas d'astérisques (**gras**), pas de dièses (# Titre), pas de tirets de liste. Écris en texte simple et naturel, structure avec des retours à la ligne et des numéros ("1. ", "2. ") si besoin d'une liste.
- Utilise des emojis gaming avec parcimonie, seulement quand ça apporte quelque chose (🎯 🔥 🏆), jamais à chaque phrase.
- Si on te pose une question hors gaming, aide quand même du mieux que tu peux — mais ton identité et ton expertise restent tournées vers le gaming et la création de contenu.
- Réponds en français par défaut, sauf si la personne écrit dans une autre langue, auquel cas tu réponds dans cette langue.`;

    const userMessages = messages.map((m: ChatMsg) => ({ role: m.role, content: m.content }));

    let providerRes: Response;

    if (usesClaude) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Clé API manquante côté serveur (ANTHROPIC_API_KEY)." },
          { status: 500 }
        );
      }
      providerRes = await fetch("https://api.anthropic.com/v1/messages", {
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
          stream: true,
          messages: userMessages,
        }),
      });
    } else {
      const apiKey = process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Clé API manquante côté serveur (DEEPSEEK_API_KEY)." },
          { status: 500 }
        );
      }
      providerRes = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          max_tokens: 2048,
          stream: true,
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages],
        }),
      });
    }

    if (!providerRes.ok || !providerRes.body) {
      const errText = await providerRes.text().catch(() => "");
      console.error(`Erreur API ${usesClaude ? "Anthropic" : "DeepSeek"}:`, errText);
      return NextResponse.json({ error: "Erreur lors de l'appel à l'IA." }, { status: 502 });
    }

    const stream = usesClaude
      ? streamPlainText(providerRes.body, (parsed) =>
          parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta"
            ? parsed.delta.text
            : null
        )
      : streamPlainText(providerRes.body, (parsed) => parsed.choices?.[0]?.delta?.content ?? null);

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Erreur serveur:", err);
    return NextResponse.json({ error: "Erreur interne du serveur." }, { status: 500 });
  }
}
