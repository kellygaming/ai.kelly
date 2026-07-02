"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./chat.css";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Comment améliorer ma précision sur Free Fire ?",
  "Comment faire des headshots sur Call of Duty Mobile ?",
  "Donne-moi 5 idées de vidéos TikTok gaming",
  "Écris-moi un script pour une vidéo sur PUBG Mobile",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || "Une erreur est survenue.");
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
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
          <span className="chat-logo-mark" />
          <span className="chat-brand-name">KellyIA</span>
        </div>
        <div className="chat-status">
          <span className="chat-status-dot" />
          En ligne
        </div>
      </header>

      {/* Messages */}
      <div ref={bodyRef} className="chat-body">
        <div className="chat-scroll-inner">
          {messages.length === 0 && (
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
              </div>
            </div>
          ))}

          {loading && (
            <div className="msg-row assistant">
              <div className="msg-avatar ai">✦</div>
              <div className="msg-bubble ai">
                <div className="typing-dots">
                  <span /><span /><span />
                </div>
              </div>
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
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
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
    </main>
  );
}
