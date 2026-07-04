"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import { startUpgrade } from "@/lib/upgrade";
import { signInWithGoogle } from "@/lib/auth";
import "./chat.css";
import ImageStudio from "./ImageStudio";
import VoiceStudio from "./VoiceStudio";

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "chat" | "image" | "voice";
type Blocked = { message: string; code: "not_authenticated" | "no_credits" } | null;

const SUGGESTIONS = [
  "Comment améliorer ma précision sur Free Fire ?",
  "Comment faire des headshots sur Call of Duty Mobile ?",
  "Donne-moi 5 idées de vidéos TikTok gaming",
  "Écris-moi un script pour une vidéo sur PUBG Mobile",
];

const TABS: Array<{ id: Mode; label: string; icon: string }> = [
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "image", label: "Miniatures", icon: "🖼️" },
  { id: "voice", label: "Voix IA", icon: "🎙️" },
];

export default function ChatPage() {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState<Blocked>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const busy = thinking || streaming;

  // Reprend automatiquement le paiement si on revient d'une connexion
  // déclenchée par le bouton "S'abonner" (voir lib/upgrade.ts).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "1") {
      window.history.replaceState({}, "", "/chat");
      startUpgrade();
    }
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking, mode]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setBlocked(null);
    setThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setThinking(false);
        if (data?.code === "not_authenticated" || data?.code === "no_credits") {
          setBlocked({ message: data.error, code: data.code });
        } else {
          setError(data?.error || "Une erreur est survenue.");
        }
        return;
      }

      if (!res.body) throw new Error("no body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let started = false;
      setStreaming(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        if (!started) {
          started = true;
          setThinking(false);
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
        }
        accumulated += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: accumulated };
          return copy;
        });
      }

      if (!started) {
        setError("Réponse vide — réessaie.");
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setThinking(false);
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <main className="chat-shell">
      <div className="chat-ambient">
        <div className="chat-blob chat-blob-a" />
        <div className="chat-blob chat-blob-b" />
      </div>

      {/* Header */}
      <header className="chat-header">
        <Link href="/" className="chat-back">
          <span aria-hidden="true">←</span> Accueil
        </Link>
        <div className="chat-brand">
          <img src="/branding/logo-k.png" alt="KellyIA" className="chat-logo-mark" />
          <span className="chat-brand-name">KellyIA</span>
        </div>
        <div className="chat-header-right">
          <div className="chat-status">
            <span className="chat-status-dot" />
            En ligne
          </div>
          <AuthButton variant="chat" />
        </div>
      </header>

      {/* Tabs */}
      <div className="chat-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`chat-tab ${mode === t.id ? "active" : ""}`}
            onClick={() => setMode(t.id)}
          >
            <span className="chat-tab-icon">{t.icon}</span>
            {t.label}
            {t.id !== "chat" && <span className="chat-tab-badge">Aperçu</span>}
          </button>
        ))}
      </div>

      {mode === "chat" ? (
        <>
          {/* Messages */}
          <div ref={bodyRef} className="chat-body">
            <div className="chat-scroll-inner">
              {messages.length === 0 && !blocked && (
                <div className="chat-empty">
                  <div className="chat-empty-icon">✦</div>
                  <h2>Prêt à progresser ?</h2>
                  <p>Astuces, stratégies, histoire des jeux ou scripts vidéo — demande-moi ce que tu veux.</p>
                  <div className="chat-suggestions">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => send(s)} className="chat-suggestion">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`msg-row ${m.role}`}>
                  <div className={`msg-avatar ${m.role === "user" ? "user" : "ai"}`}>
                    {m.role === "user" ? "V" : "✦"}
                  </div>
                  <div className={`msg-bubble ${m.role === "user" ? "user" : "ai"}`}>
                    {m.content}
                    {streaming && i === messages.length - 1 && m.role === "assistant" && (
                      <span className="stream-cursor">▍</span>
                    )}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="msg-row assistant">
                  <div className="msg-avatar ai">✦</div>
                  <div className="msg-bubble ai">
                    <div className="thinking-indicator">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-label">Réflexion en cours…</span>
                    </div>
                  </div>
                </div>
              )}

              {blocked && (
                <div className="chat-blocked">
                  <span className="chat-blocked-icon">🔒</span>
                  <p>{blocked.message}</p>
                  {blocked.code === "no_credits" ? (
                    <button type="button" className="studio-blocked-action" onClick={() => startUpgrade()}>
                      ✦ Passer à l'offre Plus
                    </button>
                  ) : (
                    <button type="button" className="studio-blocked-action" onClick={() => signInWithGoogle("/chat")}>
                      Se connecter
                    </button>
                  )}
                </div>
              )}

              {error && <p className="chat-error">⚠ {error}</p>}
            </div>
          </div>

          {/* Input */}
          <div className="chat-input-wrap">
            <div className="chat-input-inner">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="chat-input-bar"
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Écrivez votre message..."
                  rows={1}
                  className="chat-textarea"
                  disabled={busy}
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="chat-send"
                  aria-label="Envoyer"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>
              <p className="chat-foot-note">KellyIA peut faire des erreurs. Vérifiez les informations importantes.</p>
            </div>
          </div>
        </>
      ) : (
        <div className="chat-body chat-body-studio">
          <div className="chat-scroll-inner">
            {mode === "image" ? <ImageStudio /> : <VoiceStudio />}
          </div>
        </div>
      )}
    </main>
  );
}
