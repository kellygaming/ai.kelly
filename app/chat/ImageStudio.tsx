"use client";

import { useState } from "react";

const EXAMPLES = ["/showcase/thumb-crate.jpg", "/showcase/thumb-sniper.jpg"];

export default function ImageStudio() {
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<"tiktok" | "youtube">("tiktok");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isExample, setIsExample] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!prompt.trim() || status === "loading") return;
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, format }),
      });
      const data = await res.json();

      if (!res.ok) {
        // Clé pas encore branchée ou erreur fournisseur : on retombe sur un
        // exemple pour que la démo reste présentable, avec le message clair.
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
        <label className="studio-label">Décris ta miniature</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex : miniature Free Fire, texte « TOP 5 ASTUCES », style néon violet, fond flou..."
          className="studio-textarea"
          rows={4}
        />

        <div className="studio-row">
          <div className="format-toggle-studio">
            <button
              type="button"
              className={format === "tiktok" ? "active" : ""}
              onClick={() => setFormat("tiktok")}
            >
              TikTok 9:16
            </button>
            <button
              type="button"
              className={format === "youtube" ? "active" : ""}
              onClick={() => setFormat("youtube")}
            >
              YouTube 16:9
            </button>
          </div>

          <button
            type="button"
            className="studio-generate"
            onClick={generate}
            disabled={!prompt.trim() || status === "loading"}
          >
            {status === "loading" ? "Génération…" : <>✦ Générer</>}
          </button>
        </div>

        {error && <p className="studio-error">⚠ {error} — un exemple est affiché à la place.</p>}
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
            {isExample && (
              <span className="studio-preview-badge">Exemple — vérifie ta clé FAL_KEY</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
