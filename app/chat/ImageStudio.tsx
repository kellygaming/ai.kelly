"use client";

import { useRef, useState } from "react";

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
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setRefImage(dataUrl);
    } catch {
      setError("Impossible de lire cette image.");
    }
    e.target.value = "";
  }

  async function suggestPrompt() {
    if (!refImage || suggesting) return;
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
        setError(data?.error || "Impossible de suggérer un prompt.");
      } else {
        setPrompt(data.prompt);
      }
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSuggesting(false);
    }
  }

  async function generate() {
    if (!prompt.trim() || status === "loading") return;
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, format, imageDataUrl: refImage }),
      });
      const data = await res.json();

      if (!res.ok) {
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

  return (
    <div className="studio-panel">
      <div className="studio-form">
        <div className="studio-tips">
          💡 Astuce : dépose une image qui ressemble à ce que tu veux (capture d'écran, miniature
          existante), puis décris juste ce qui doit changer. Le résultat sera bien plus proche de
          ton idée qu'avec un texte seul.
        </div>

        {refImage ? (
          <div className="ref-image-preview">
            <img src={refImage} alt="Image de référence" />
            <button type="button" className="ref-image-remove" onClick={() => setRefImage(null)}>
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

        <div className="studio-label-row">
          <label className="studio-label">Décris ta miniature</label>
          {refImage && (
            <button type="button" className="suggest-btn" onClick={suggestPrompt} disabled={suggesting}>
              {suggesting ? "Analyse…" : "✦ Suggérer un prompt"}
            </button>
          )}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex : texte « TOP 5 ASTUCES » en gros, style néon violet, fond flou..."
          className="studio-textarea"
          rows={4}
        />

        <div className="studio-row">
          <div className="format-toggle-studio">
            <button type="button" className={format === "tiktok" ? "active" : ""} onClick={() => setFormat("tiktok")}>
              TikTok 9:16
            </button>
            <button type="button" className={format === "youtube" ? "active" : ""} onClick={() => setFormat("youtube")}>
              YouTube 16:9
            </button>
          </div>

          <button type="button" className="studio-generate" onClick={generate} disabled={!prompt.trim() || status === "loading"}>
            {status === "loading" ? "Génération…" : <>✦ Générer</>}
          </button>
        </div>

        {error && <p className="studio-error">⚠ {error}</p>}
      </div>

      <div className={`studio-result ${format === "tiktok" ? "fmt-tiktok" : "fmt-youtube"}`}>
        {status === "idle" && (
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
