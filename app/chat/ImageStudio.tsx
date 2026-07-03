"use client";

import { useRef, useState } from "react";
import { startUpgrade } from "@/lib/upgrade";
import { signInWithGoogle } from "@/lib/auth";

const EXAMPLES = ["/showcase/thumb-crate.jpg", "/showcase/thumb-sniper.jpg"];
const MAX_DIMENSION = 1280;

// Redimensionne et compresse l'image côté navigateur avant envoi,
// pour rester léger et rapide (utile sur connexions mobiles).
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas non disponible"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<"tiktok" | "youtube">("tiktok");
  const [refImage, setRefImage] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [enhanced, setEnhanced] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [error, setError] = useState("");
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [blockedCode, setBlockedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setRefImage(dataUrl);
      setEnhanced(false);
    } catch {
      setError("Impossible de lire cette image.");
    }
    e.target.value = "";
  }

  function handlePromptChange(value: string) {
    setPrompt(value);
    // Toute modification manuelle invalide l'amélioration précédente :
    // on ne veut pas qu'on puisse contourner l'étape en réécrivant après coup.
    setEnhanced(false);
  }

  async function enhancePrompt() {
    if (suggesting || (!prompt.trim() && !refImage)) return;
    setSuggesting(true);
    setError("");
    try {
      const res = await fetch("/api/suggest-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: refImage, idea: prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Impossible d'améliorer ce prompt.");
      } else {
        setPrompt(data.prompt);
        setEnhanced(true);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSuggesting(false);
    }
  }

  async function generate() {
    if (!enhanced || !prompt.trim() || status === "loading") return;
    setStatus("loading");
    setError("");
    setBlockedReason(null);

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, format, imageDataUrl: refImage }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data?.code === "not_authenticated" || data?.code === "no_credits") {
          setBlockedReason(data.error);
          setBlockedCode(data.code);
          setStatus("idle");
          return;
        }
        setError(data?.error || "Une erreur est survenue.");
        setResultUrl(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
        setIsExample(true);
        setStatus("done");
        return;
      }

      setResultUrl(data.url);
      setIsExample(false);
      setStatus("done");
    } catch {
      setError("Impossible de contacter le serveur.");
      setResultUrl(EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
      setIsExample(true);
      setStatus("done");
    }
  }

  const canEnhance = (prompt.trim().length > 0 || !!refImage) && !suggesting;

  return (
    <div className="studio-panel">
      <div className="studio-form">
        <div className="studio-tips">
          💡 Astuce : dépose une image qui ressemble à ce que tu veux (capture d'écran, miniature
          existante), écris ton idée, puis clique sur <strong>Améliorer le prompt</strong> — le
          résultat sera nettement meilleur qu'avec un prompt brut.
        </div>

        {refImage ? (
          <div className="ref-image-preview">
            <img src={refImage} alt="Image de référence" />
            <button
              type="button"
              className="ref-image-remove"
              onClick={() => {
                setRefImage(null);
                setEnhanced(false);
              }}
            >
              ✕ Retirer
            </button>
          </div>
        ) : (
          <button type="button" className="ref-image-upload" onClick={() => fileInputRef.current?.click()}>
            📎 Déposer une image de référence (optionnel)
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFile}
          style={{ display: "none" }}
        />

        <label className="studio-label">Ton idée</label>
        <textarea
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          placeholder="Ex : texte « TOP 5 ASTUCES », style néon violet, fond flou..."
          className="studio-textarea"
          rows={3}
        />

        <button
          type="button"
          className={`enhance-btn ${enhanced ? "enhance-btn-done" : ""}`}
          onClick={enhancePrompt}
          disabled={!canEnhance}
        >
          <span className="enhance-btn-shine" />
          {suggesting ? (
            "Amélioration en cours…"
          ) : enhanced ? (
            <>✓ Prompt amélioré — prêt à générer</>
          ) : (
            <>✨ Améliorer le prompt (obligatoire)</>
          )}
        </button>

        <div className="studio-row">
          <div className="format-toggle-studio">
            <button type="button" className={format === "tiktok" ? "active" : ""} onClick={() => setFormat("tiktok")}>
              TikTok 9:16
            </button>
            <button type="button" className={format === "youtube" ? "active" : ""} onClick={() => setFormat("youtube")}>
              YouTube 16:9
            </button>
          </div>

          <button
            type="button"
            className="studio-generate"
            onClick={generate}
            disabled={!enhanced || !prompt.trim() || status === "loading"}
            title={!enhanced ? "Améliore d'abord ton prompt" : undefined}
          >
            {status === "loading" ? "Génération…" : enhanced ? <>✦ Générer</> : <>🔒 Générer</>}
          </button>
        </div>
        {!enhanced && (
          <p className="studio-lock-hint">👆 Améliore ton prompt pour débloquer la génération</p>
        )}

        {error && <p className="studio-error">⚠ {error}</p>}
      </div>

      <div className={`studio-result ${format === "tiktok" ? "fmt-tiktok" : "fmt-youtube"}`}>
        {blockedReason && (
          <div className="studio-blocked">
            <span className="studio-blocked-icon">🔒</span>
            <p>{blockedReason}</p>
            {blockedCode === "no_credits" ? (
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
        {!blockedReason && status === "idle" && (
          <div className="studio-placeholder">
            <span className="studio-placeholder-icon">🖼️</span>
            <p>Ton résultat apparaîtra ici</p>
          </div>
        )}
        {status === "loading" && (
          <div className="studio-loading">
            <div className="gen-shimmer" />
            <div className="gen-progress"><div className="gen-progress-bar" /></div>
          </div>
        )}
        {status === "done" && resultUrl && (
          <div className="studio-image-result">
            <img src={resultUrl} alt="Miniature générée" />
            {isExample && <span className="studio-preview-badge">Exemple — vérifie ta clé FAL_KEY</span>}
          </div>
        )}
      </div>
    </div>
  );
}
