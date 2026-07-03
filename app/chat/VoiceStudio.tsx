"use client";

import { useEffect, useRef, useState } from "react";

const VOICES = [
  { id: "kelly", name: "Kelly", tag: "Énergique · Homme", emoji: "🎙️" },
  { id: "aicha", name: "Aïcha", tag: "Dynamique · Femme", emoji: "🎤" },
  { id: "yao", name: "Yao", tag: "Narrateur posé · Homme", emoji: "🗣️" },
  { id: "fatou", name: "Fatou", tag: "Hype · Femme", emoji: "🔊" },
];

export default function VoiceStudio() {
  const [text, setText] = useState("");
  const [voice, setVoice] = useState(VOICES[0].id);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState("0:00");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function generate() {
    if (!text.trim() || status === "loading") return;
    setStatus("loading");
    setError("");
    setBlockedReason(null);
    setPlaying(false);

    try {
      const res = await fetch("/api/generate-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceKey: voice }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.code === "not_authenticated" || data?.code === "no_credits") {
          setBlockedReason(data.error);
          setStatus("idle");
          return;
        }
        setError(data?.error || "Une erreur est survenue.");
        setStatus("error");
        return;
      }

      const blob = await res.blob();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;

      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onloadedmetadata = () => {
          const d = audioRef.current?.duration || 0;
          const m = Math.floor(d / 60);
          const s = Math.floor(d % 60).toString().padStart(2, "0");
          setDuration(`${m}:${s}`);
        };
      }
      setStatus("done");
    } catch {
      setError("Impossible de contacter le serveur.");
      setStatus("error");
    }
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }

  const selectedVoice = VOICES.find((v) => v.id === voice)!;

  return (
    <div className="studio-panel">
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        hidden
      />

      <div className="studio-form">
        <label className="studio-label">Texte à lire</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Colle ton script ici, l'IA le lira avec la voix choisie..."
          className="studio-textarea"
          rows={4}
        />

        <label className="studio-label studio-label-spaced">Choisis une voix</label>
        <div className="voice-grid">
          {VOICES.map((v) => (
            <button
              type="button"
              key={v.id}
              className={`voice-card ${voice === v.id ? "active" : ""}`}
              onClick={() => setVoice(v.id)}
            >
              <span className="voice-emoji">{v.emoji}</span>
              <span className="voice-name">{v.name}</span>
              <span className="voice-tag">{v.tag}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="studio-generate studio-generate-full"
          onClick={generate}
          disabled={!text.trim() || status === "loading"}
        >
          {status === "loading" ? "Génération…" : <>✦ Générer la voix</>}
        </button>

        {status === "error" && <p className="studio-error">⚠ {error}</p>}
      </div>

      <div className="studio-result studio-result-audio">
        {blockedReason && (
          <div className="studio-blocked">
            <span className="studio-blocked-icon">🔒</span>
            <p>{blockedReason}</p>
          </div>
        )}
        {!blockedReason && status === "idle" && (
          <div className="studio-placeholder">
            <span className="studio-placeholder-icon">🎧</span>
            <p>Ton audio apparaîtra ici</p>
          </div>
        )}
        {status === "loading" && (
          <div className="studio-loading">
            <div className="gen-shimmer" />
            <div className="gen-progress"><div className="gen-progress-bar" /></div>
          </div>
        )}
        {status === "done" && (
          <div className="audio-player">
            <div className="audio-controls">
              <button type="button" className="audio-play-btn" onClick={togglePlay} aria-label={playing ? "Pause" : "Lecture"}>
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="2" width="3.5" height="10" rx="1"/><rect x="8.5" y="2" width="3.5" height="10" rx="1"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2l9 5-9 5V2z"/></svg>
                )}
              </button>
              <div className={`waveform ${playing ? "playing" : ""}`}>
                {Array.from({ length: 28 }).map((_, i) => (
                  <span key={i} style={{ animationDelay: `${(i % 7) * 0.08}s`, height: `${18 + ((i * 37) % 60)}%` }} />
                ))}
              </div>
              <span className="audio-duration">{duration}</span>
            </div>
            <div className="audio-footer">
              <span className="audio-voice-tag">{selectedVoice.emoji} Voix : {selectedVoice.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
