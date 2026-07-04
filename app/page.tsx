"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthButton from "@/components/AuthButton";
import { startUpgrade } from "@/lib/upgrade";
import "./landing.css";

export default function Home() {
  const [upgradeState, setUpgradeState] = useState<"idle" | "loading" | "error">("idle");
  const [upgradeError, setUpgradeError] = useState("");

  async function handleUpgradeClick() {
    setUpgradeState("loading");
    setUpgradeError("");
    const { error } = await startUpgrade();
    if (error) {
      setUpgradeError(error);
      setUpgradeState("error");
    }
    // Si pas d'erreur : soit redirection vers Google, soit vers MoneyFusion —
    // dans les deux cas la page va changer, pas besoin de gérer "idle" ici.
  }

  useEffect(() => {
    let cancelled = false;
    const cleanupFns: Array<() => void> = [];

    // ===== Reveal au scroll =====
    const revealEls = document.querySelectorAll(".reveal");
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
    cleanupFns.push(() => revealObserver.disconnect());

    // ===== Nav : fond au scroll =====
    const nav = document.getElementById("nav");
    const onScroll = () => {
      if (!nav) return;
      if (window.scrollY > 20) nav.classList.add("scrolled");
      else nav.classList.remove("scrolled");
    };
    window.addEventListener("scroll", onScroll);
    cleanupFns.push(() => window.removeEventListener("scroll", onScroll));

    // ===== Compteurs de stats =====
    function animateCounter(el: Element) {
      const target = parseInt((el as HTMLElement).dataset.target || "0", 10);
      const duration = 1600;
      const start = performance.now();
      function tick(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.floor(eased * target);
        el.textContent = target >= 1000 ? value.toLocaleString("fr-FR") : String(value);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target >= 1000 ? target.toLocaleString("fr-FR") : String(target);
      }
      requestAnimationFrame(tick);
    }
    const counters = document.querySelectorAll(".stat-num");
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => counterObserver.observe(c));
    cleanupFns.push(() => counterObserver.disconnect());

    // ===== FAQ accordéon =====
    const faqHandlers: Array<() => void> = [];
    document.querySelectorAll(".faq-item").forEach((item) => {
      const q = item.querySelector(".faq-q");
      const a = item.querySelector(".faq-a") as HTMLElement | null;
      if (!q || !a) return;
      const handler = () => {
        const isOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach((openItem) => {
          openItem.classList.remove("open");
          const openA = openItem.querySelector(".faq-a") as HTMLElement | null;
          if (openA) openA.style.maxHeight = "";
        });
        if (!isOpen) {
          item.classList.add("open");
          a.style.maxHeight = a.scrollHeight + "px";
        }
      };
      q.addEventListener("click", handler);
      faqHandlers.push(() => q.removeEventListener("click", handler));
    });
    cleanupFns.push(() => faqHandlers.forEach((fn) => fn()));

    // ===== Particules flottantes du hero =====
    const particlesContainer = document.getElementById("particles");
    if (particlesContainer) {
      const count = window.innerWidth < 700 ? 14 : 28;
      for (let i = 0; i < count; i++) {
        const p = document.createElement("div");
        p.className = "particle";
        p.style.left = Math.random() * 100 + "%";
        p.style.bottom = "-10px";
        p.style.animationDuration = 10 + Math.random() * 12 + "s";
        p.style.animationDelay = Math.random() * 10 + "s";
        p.style.opacity = (0.3 + Math.random() * 0.4).toString();
        particlesContainer.appendChild(p);
      }
    }

    // ===== Effet "machine à écrire" pour le prompt IA (miniatures) =====
    const promptText = document.getElementById("promptText");
    if (promptText) {
      const prompts = [
        "miniature Free Fire avec un headshot explosif",
        "thumbnail PUBG Mobile style clickbait",
        "miniature COD Mobile néon et texte choc",
      ];
      let promptIndex = 0;

      function typePrompt() {
        if (cancelled || !promptText) return;
        const text = prompts[promptIndex];
        let charIndex = 0;
        promptText.textContent = "";

        function typeChar() {
          if (cancelled || !promptText) return;
          if (charIndex <= text.length) {
            promptText.textContent = text.slice(0, charIndex);
            charIndex++;
            setTimeout(typeChar, 45);
          } else {
            setTimeout(erasePrompt, 2200);
          }
        }

        function erasePrompt() {
          if (cancelled || !promptText) return;
          if (charIndex >= 0) {
            promptText.textContent = text.slice(0, charIndex);
            charIndex--;
            setTimeout(erasePrompt, 22);
          } else {
            promptIndex = (promptIndex + 1) % prompts.length;
            setTimeout(typePrompt, 400);
          }
        }

        typeChar();
      }

      typePrompt();
    }

    // ===== Effet "machine à écrire" pour le sujet du script vidéo =====
    const scriptTopic = document.getElementById("scriptTopic");
    if (scriptTopic) {
      const topics = [
        "5 astuces pour viser comme un pro sur Free Fire",
        "Le meilleur loadout COD Mobile de la saison",
        "3 erreurs qui te font perdre sur PUBG Mobile",
      ];
      let topicIndex = 0;

      function typeTopic() {
        if (cancelled || !scriptTopic) return;
        const text = topics[topicIndex];
        let charIndex = 0;
        scriptTopic.textContent = "";

        function typeChar() {
          if (cancelled || !scriptTopic) return;
          if (charIndex <= text.length) {
            scriptTopic.textContent = text.slice(0, charIndex);
            charIndex++;
            setTimeout(typeChar, 40);
          } else {
            setTimeout(eraseTopic, 2400);
          }
        }

        function eraseTopic() {
          if (cancelled || !scriptTopic) return;
          if (charIndex >= 0) {
            scriptTopic.textContent = text.slice(0, charIndex);
            charIndex--;
            setTimeout(eraseTopic, 20);
          } else {
            topicIndex = (topicIndex + 1) % topics.length;
            setTimeout(typeTopic, 450);
          }
        }

        typeChar();
      }

      typeTopic();
    }
    cleanupFns.push(() => {
      cancelled = true;
    });

    // ===== Menu mobile (burger) =====
    const burger = document.getElementById("navBurger");
    const onBurgerClick = () => {
      let overlay = document.getElementById("mobileMenu");
      if (overlay) {
        overlay.remove();
        return;
      }
      overlay = document.createElement("div");
      overlay.id = "mobileMenu";
      overlay.style.cssText = `
        position:fixed; inset:0; z-index:200;
        background:rgba(7,7,13,.97); backdrop-filter:blur(10px);
        display:flex; flex-direction:column; align-items:center; justify-content:center; gap:28px;
        font-family:'Space Grotesk', sans-serif; font-size:22px;
      `;
      const links: Array<[string, string]> = [
        ["Fonctionnalités", "#fonctionnalites"],
        ["Studio créateur", "#ia"],
        ["Tarifs", "#tarifs"],
        ["Avis", "#avis"],
        ["FAQ", "#faq"],
      ];
      links.forEach(([label, href]) => {
        const a = document.createElement("a");
        a.href = href;
        a.textContent = label;
        a.style.color = "#fff";
        a.addEventListener("click", () => overlay?.remove());
        overlay!.appendChild(a);
      });
      document.body.appendChild(overlay);
    };
    if (burger) burger.addEventListener("click", onBurgerClick);
    cleanupFns.push(() => {
      if (burger) burger.removeEventListener("click", onBurgerClick);
      document.getElementById("mobileMenu")?.remove();
    });

    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  return (
    <>


      <div className="bg-noise"></div>

      {/* NAV */}
      <header className="nav" id="nav">
        <div className="nav-inner">
          <Link href="/" className="logo">
            <img src="/branding/logo-k.png" alt="KellyIA" className="logo-mark" />
            KellyIA
          </Link>
          <nav className="nav-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#ia">Studio créateur</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#avis">Avis</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-actions">
            <AuthButton variant="landing" />
            <Link href="/chat" className="btn btn-primary">Commencer</Link>
          </div>
          <button className="nav-burger" id="navBurger" aria-label="Ouvrir le menu">
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow hero-glow-a"></div>
        <div className="hero-glow hero-glow-b"></div>
        <div className="hero-lines">
          <svg viewBox="0 0 1600 900" preserveAspectRatio="none">
            <path d="M-100,700 C 300,600 500,780 900,650 S 1400,500 1700,600" stroke="url(#lineGrad1)" strokeWidth="1" fill="none" opacity="0.5"/>
            <path d="M-100,300 C 350,250 600,420 950,320 S 1500,180 1750,280" stroke="url(#lineGrad2)" strokeWidth="1" fill="none" opacity="0.4"/>
            <defs>
              <linearGradient id="lineGrad1" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#4B7DFF" stopOpacity="0"/>
                <stop offset="50%" stopColor="#67B7FF" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#4B7DFF" stopOpacity="0"/>
              </linearGradient>
              <linearGradient id="lineGrad2" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#A44BFF" stopOpacity="0"/>
                <stop offset="50%" stopColor="#C878FF" stopOpacity="0.6"/>
                <stop offset="100%" stopColor="#A44BFF" stopOpacity="0"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="particles" id="particles"></div>

        <div className="hero-inner">
          <div className="hero-copy reveal">
            <span className="eyebrow">
              <span className="eyebrow-dot"></span>
              L'IA 100% gaming, faite pour l'Afrique
            </span>
            <h1 className="hero-title">
              Deviens plus fort.<br />
              <span className="grad-text">Crée plus vite.</span>
            </h1>
            <p className="hero-sub">
              Astuces Free Fire, PUBG Mobile, Call of Duty et plus — plus miniatures et scripts pour tes vidéos.
              Sans carte bancaire : payez avec Wave, Orange Money ou MTN Mobile Money.
            </p>
            <div className="hero-actions">
              <Link href="/chat" className="btn btn-primary btn-lg">
                Commencer gratuitement
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <a href="#ia" className="btn btn-ghost btn-lg">Voir le studio créateur</a>
            </div>
            <div className="hero-trust">
              <div className="trust-item"><strong>50K+</strong><span>Astuces données</span></div>
              <div className="trust-divider"></div>
              <div className="trust-item"><strong>&lt; 3s</strong><span>Temps de réponse</span></div>
              <div className="trust-divider"></div>
              <div className="trust-item"><strong>4.9/5</strong><span>Satisfaction</span></div>
            </div>
          </div>

          <div className="hero-visual reveal" style={{transitionDelay: '.15s'}}>
            <div className="orb-wrap">
              <div className="orb">
                <div className="orb-ring"></div>
                <div className="orb-core"></div>
                <div className="orb-shine"></div>
                <div className="orb-star s1"></div>
                <div className="orb-star s2"></div>
                <div className="orb-star s3"></div>
              </div>
              <div className="orb-card oc-1">
                <span className="oc-icon">🎯</span>
                <div><strong>Combo débloqué</strong><small>en 3 secondes</small></div>
              </div>
              <div className="orb-card oc-2">
                <span className="oc-icon">✓</span>
                <div><strong>Wave / MTN</strong><small>Sans carte bancaire</small></div>
              </div>
              <div className="orb-card oc-3">
                <span className="oc-icon">🖼️</span>
                <div><strong>Miniature créée</strong><small>à l'instant</small></div>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-hint">
          <span>Défiler</span>
          <div className="scroll-hint-line"></div>
        </div>
      </section>

      {/* BANDE MARQUES / JEUX */}
      <section className="marquee-section">
        <div className="marquee">
          <div className="marquee-track">
            <span>Free Fire</span><span>•</span><span>PUBG Mobile</span><span>•</span>
            <span>Call of Duty Mobile</span><span>•</span><span>Fortnite</span><span>•</span>
            <span>Miniatures</span><span>•</span><span>Scripts vidéo</span><span>•</span>
            <span>Free Fire</span><span>•</span><span>PUBG Mobile</span><span>•</span>
            <span>Call of Duty Mobile</span><span>•</span><span>Fortnite</span><span>•</span>
            <span>Miniatures</span><span>•</span><span>Scripts vidéo</span><span>•</span>
          </div>
        </div>
      </section>

      {/* BLOC IA */}
      <section className="ia-section" id="ia">
        <div className="ia-glow"></div>
        <div className="ia-wave">
          <svg viewBox="0 0 1600 500" preserveAspectRatio="none">
            <path d="M0,250 C 400,100 700,400 1100,220 S 1500,60 1600,180 L1600,500 L0,500 Z" fill="url(#waveGrad)" opacity="0.5"/>
            <defs>
              <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#A44BFF"/>
                <stop offset="100%" stopColor="#FF4FD8"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="ia-inner">
          <div className="ia-heading reveal">
            <span className="eyebrow eyebrow-purple">
              <span className="eyebrow-dot dot-purple"></span>
              Studio créateur gaming
            </span>
            <h2 className="section-title">Crée tes miniatures<br /><span className="grad-text-2">qui font exploser tes vues</span></h2>
            <p className="section-sub">
              Génère des miniatures percutantes au format TikTok ou YouTube.
              Décris ta vidéo, l'IA fait le reste.
            </p>
          </div>

          <div className="ia-console reveal" style={{transitionDelay: '.1s'}}>
            {/* interface holographique */}
            <div className="holo-beam"></div>
            <div className="console-card">
              <div className="console-top">
                <div className="console-dots"><span></span><span></span><span></span></div>
                <span className="console-label">kellyia.ai — miniatures en direct</span>
                <span className="console-status"><span className="status-dot"></span>En ligne</span>
              </div>

              <div className="console-body">
                <div className="prompt-row">
                  <span className="prompt-caret">›</span>
                  <span className="prompt-text" id="promptText"></span>
                  <span className="prompt-cursor">▍</span>
                </div>

                <div className="gen-grid">
                  <div className="gen-card gen-loading">
                    <div className="gen-shimmer"></div>
                    <div className="gen-progress"><div className="gen-progress-bar"></div></div>
                    <span className="gen-tag">Génération…</span>
                  </div>
                  <div className="gen-card gen-showcase">
                    <img src="/showcase/thumb-crate.jpg" alt="Miniature gaming créée avec KellyIA — caisse néon" className="carousel-img" />
                    <img src="/showcase/thumb-sniper.jpg" alt="Miniature gaming créée avec KellyIA — sniper Call of Duty" className="carousel-img" />
                    <span className="gen-tag gen-tag-ok">✓ Créées avec KellyIA</span>
                    <div className="carousel-dots">
                      <span className="carousel-dot dot-a"></span>
                      <span className="carousel-dot dot-b"></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="console-footer">
                <div className="mini-stat"><strong>2.4s</strong><small>Temps moyen</small></div>
                <div className="mini-stat"><strong>9:16</strong><small>Format TikTok</small></div>
                <div className="mini-stat"><strong>16:9</strong><small>Format YouTube</small></div>
              </div>
            </div>

            {/* reprise du concept main / bouton holographique */}
            <div className="holo-reach">
              <div className="holo-hand"></div>
              <div className="holo-button">
                <span>Créer</span>
              </div>
              <div className="holo-ripple"></div>
            </div>

            <div className="ia-badge badge-1">Formats TikTok & YouTube</div>
            <div className="ia-badge badge-2">Textes accrocheurs</div>
            <div className="ia-badge badge-3">Temps réel</div>
          </div>
        </div>
      </section>

      {/* SCRIPTS VIDÉO */}
      <section className="script-section" id="scripts">
        <div className="script-glow"></div>
        <div className="script-inner">
          <div className="script-heading reveal">
            <span className="eyebrow eyebrow-purple">
              <span className="eyebrow-dot dot-purple"></span>
              Studio créateur gaming
            </span>
            <h2 className="section-title">Écris ton script<br /><span className="grad-text-2">en un clic</span></h2>
            <p className="section-sub">
              Donne un sujet, l'IA structure ton script YouTube ou TikTok :
              accroche, contenu, appel à l'action.
            </p>
          </div>

          <div className="script-console reveal" style={{transitionDelay: '.1s'}}>
            <div className="script-card">
              <div className="script-top">
                <div className="script-format-toggle">
                  <span className="format-chip active">TikTok</span>
                  <span className="format-chip">YouTube</span>
                </div>
                <span className="script-duration">⏱ 0:45</span>
              </div>

              <div className="script-topic">
                <span className="script-topic-label">Sujet</span>
                <span className="script-topic-text" id="scriptTopic"></span>
                <span className="prompt-cursor">▍</span>
              </div>

              <div className="script-timeline">
                <div className="script-beat beat-hook">
                  <div className="beat-head"><span className="beat-time">0:00–0:03</span><span className="beat-tag beat-tag-hook">Accroche</span></div>
                  <p>"Voici l'erreur qui te fait perdre CHAQUE partie sur Free Fire..."</p>
                </div>
                <div className="script-beat beat-body">
                  <div className="beat-head"><span className="beat-time">0:03–0:30</span><span className="beat-tag beat-tag-body">Contenu</span></div>
                  <p>3 astuces concrètes de sensibilité et de rotation, démontrées à l'écran.</p>
                </div>
                <div className="script-beat beat-cta">
                  <div className="beat-head"><span className="beat-time">0:30–0:45</span><span className="beat-tag beat-tag-cta">Appel à l'action</span></div>
                  <p>"Abonne-toi pour le prochain combo qui va tout changer."</p>
                </div>
              </div>
            </div>

            <div className="script-ideas">
              <div className="script-video-demo">
                <video
                  className="script-video"
                  src="/showcase/script-demo.mp4"
                  poster="/showcase/script-demo-poster.jpg"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
                <span className="script-video-badge">Exemple de rendu</span>
              </div>
              <span className="script-ideas-label">Idées de sujets suggérées</span>
              <div className="idea-chip idea-1">🔥 Top 5 sensibilités Free Fire</div>
              <div className="idea-chip idea-2">🎯 3 astuces headshot COD Mobile</div>
              <div className="idea-chip idea-3">🕹️ L'histoire méconnue de PUBG</div>
            </div>
          </div>
        </div>
      </section>
      <section className="products-section" id="fonctionnalites">
        <div className="ambient-icon ai-1">🎮</div>
        <div className="ambient-icon ai-2">🖼️</div>
        <div className="ambient-icon ai-3">✍️</div>
        <div className="section-head reveal">
          <span className="eyebrow"><span className="eyebrow-dot"></span>Ce que vous pouvez faire</span>
          <h2 className="section-title">Une IA, 100% gaming</h2>
          <p className="section-sub">Coaching, culture gaming et création de contenu, dans un seul assistant.</p>
        </div>

        <div className="products-grid">
          <div className="product-card reveal" style={{transitionDelay: '.05s'}}>
            <div className="product-glow pg-orange"></div>
            <div className="product-icon">🎮</div>
            <h3>Coaching gaming</h3>
            <p>Astuces et stratégies pour Free Fire, PUBG Mobile, Call of Duty Mobile et plus.</p>
            <div className="product-meta"><span>Gratuit pour commencer</span><span className="tag">Populaire</span></div>
          </div>
          <div className="product-card reveal" style={{transitionDelay: '.1s'}}>
            <div className="product-glow pg-red"></div>
            <div className="product-icon">📜</div>
            <h3>Histoire & culture gaming</h3>
            <p>L'histoire de tes jeux préférés, mises à jour, lore et actu esport.</p>
            <div className="product-meta"><span>Illimité en abonnement</span></div>
          </div>
          <div className="product-card reveal" style={{transitionDelay: '.15s'}}>
            <div className="product-glow pg-blue"></div>
            <div className="product-icon">🖼️</div>
            <h3>Miniatures TikTok / YouTube</h3>
            <p>Génère des miniatures qui donnent vraiment envie de cliquer.</p>
            <div className="product-meta"><span>Dès l'offre Plus</span></div>
          </div>
          <div className="product-card reveal" style={{transitionDelay: '.2s'}}>
            <div className="product-glow pg-purple"></div>
            <div className="product-icon">✍️</div>
            <h3>Scripts vidéo</h3>
            <p>Scripts prêts à tourner pour tes vidéos et shorts gaming.</p>
            <div className="product-meta"><span>Inclus dans tous les plans</span></div>
          </div>
        </div>
      </section>

      {/* POURQUOI */}
      <section className="why-section">
        <div className="ambient-icon ai-4">🌍</div>
        <div className="ambient-icon ai-5">📲</div>
        <div className="section-head reveal">
          <span className="eyebrow"><span className="eyebrow-dot"></span>Pourquoi nous</span>
          <h2 className="section-title">Pourquoi choisir KellyIA</h2>
        </div>

        <div className="why-grid">
          <div className="why-card reveal">
            <div className="why-icon">⚡</div>
            <h3>Coaching instantané</h3>
            <p>Une astuce, une stratégie ou un script en quelques secondes, 24h/24.</p>
          </div>
          <div className="why-card reveal" style={{transitionDelay: '.08s'}}>
            <div className="why-icon">📲</div>
            <h3>Paiement 100% local</h3>
            <p>Wave, Orange Money, MTN Mobile Money — aucune carte bancaire nécessaire.</p>
          </div>
          <div className="why-card reveal" style={{transitionDelay: '.16s'}}>
            <div className="why-icon">🌍</div>
            <h3>Pensée pour l'Afrique</h3>
            <p>Optimisée pour les connexions mobiles et les réalités du continent.</p>
          </div>
          <div className="why-card reveal" style={{transitionDelay: '.24s'}}>
            <div className="why-icon">🔒</div>
            <h3>Vos données protégées</h3>
            <p>Vos conversations restent privées et ne sont jamais revendues.</p>
          </div>
        </div>
      </section>

      {/* TARIFS / PAIEMENT LOCAL */}
      <section className="pricing-section" id="tarifs">
        <div className="pricing-glow"></div>
        <div className="section-head reveal">
          <span className="eyebrow eyebrow-purple"><span className="eyebrow-dot dot-purple"></span>Fait pour l'Afrique</span>
          <h2 className="section-title">Abonnez-vous sans<br /><span className="grad-text-2">carte bancaire</span></h2>
          <p className="section-sub">Payez directement avec votre opérateur mobile. Aucun compte bancaire requis.</p>
        </div>

        <div className="pricing-wrap">
          <div className="pricing-grid reveal">
            <div className="price-card">
              <span className="price-tag">Gratuit</span>
              <div className="price-amount">0 <small>FCFA</small></div>
              <p className="price-desc">Pour découvrir l'assistant au quotidien.</p>
              <ul className="price-list">
                <li>20 messages de coaching / mois</li>
                <li>3 miniatures / mois</li>
                <li>2 générations voix / mois</li>
                <li>Historique 7 jours</li>
              </ul>
              <Link href="/chat" className="btn btn-ghost price-btn">Commencer</Link>
            </div>
            <div className="price-card price-card-featured">
              <span className="price-tag price-tag-featured">Plus</span>
              <div className="price-amount">3 500 <small>FCFA / mois</small></div>
              <p className="price-desc">Pour les créateurs et joueurs réguliers.</p>
              <ul className="price-list">
                <li>300 messages de coaching / mois</li>
                <li>12 miniatures TikTok / YouTube / mois</li>
                <li>8 générations voix / mois</li>
                <li>Historique illimité</li>
              </ul>
              <button
                type="button"
                className="btn btn-primary price-btn"
                onClick={handleUpgradeClick}
                disabled={upgradeState === "loading"}
              >
                {upgradeState === "loading" ? "Un instant…" : "S'abonner"}
              </button>
              {upgradeState === "error" && (
                <p className="price-error">⚠ {upgradeError}</p>
              )}
            </div>
          </div>

          <div className="pay-methods reveal" style={{transitionDelay: '.1s'}}>
            <p className="pay-methods-label">Payez avec l'opérateur de votre choix</p>
            <div className="pay-badges">
              <span className="pay-badge pb-1">Wave</span>
              <span className="pay-badge pb-2">Orange Money</span>
              <span className="pay-badge pb-3">MTN Mobile Money</span>
              <span className="pay-badge pb-4">Moov Money</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-section">
        <div className="stats-glow"></div>
        <div className="stats-grid">
          <div className="stat reveal">
            <strong className="stat-num" data-target="50000">0</strong>
            <span>Astuces données</span>
          </div>
          <div className="stat reveal" style={{transitionDelay: '.06s'}}>
            <strong className="stat-num" data-target="12000">0</strong>
            <span>Miniatures créées</span>
          </div>
          <div className="stat reveal" style={{transitionDelay: '.12s'}}>
            <strong className="stat-num" data-target="8000">0</strong>
            <span>Scripts générés</span>
          </div>
          <div className="stat reveal" style={{transitionDelay: '.18s'}}>
            <strong className="stat-num" data-target="3">0</strong>
            <span>Secondes de réponse</span>
          </div>
        </div>
      </section>

      {/* FONCTIONNEMENT */}
      <section className="how-section" id="fonctionnement">
        <div className="section-head reveal">
          <span className="eyebrow"><span className="eyebrow-dot"></span>Simple et rapide</span>
          <h2 className="section-title">Comment ça marche</h2>
        </div>

        <div className="steps">
          <div className="step reveal">
            <span className="step-num">01</span>
            <h3>Pose ta question gaming</h3>
            <p>Astuce, stratégie ou histoire d'un jeu — demande librement.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step reveal" style={{transitionDelay: '.08s'}}>
            <span className="step-num">02</span>
            <h3>Reçois ta réponse</h3>
            <p>Conseils clairs et actionnables en quelques secondes.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step reveal" style={{transitionDelay: '.16s'}}>
            <span className="step-num">03</span>
            <h3>Crée du contenu</h3>
            <p>Génère miniatures et scripts pour tes vidéos.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step reveal" style={{transitionDelay: '.24s'}}>
            <span className="step-num">04</span>
            <h3>Payez en local</h3>
            <p>Wave, Orange Money ou MTN Mobile Money, en un clic.</p>
          </div>
        </div>
      </section>

      {/* AVIS */}
      <section className="reviews-section" id="avis">
        <div className="section-head reveal">
          <span className="eyebrow"><span className="eyebrow-dot"></span>Témoignages</span>
          <h2 className="section-title">Ce qu'ils en disent</h2>
        </div>

        <div className="reviews-grid">
          <div className="review-card reveal">
            <div className="stars">★★★★★</div>
            <p>"Grâce aux astuces de sensibilité, j'ai enfin débloqué le rang Héroïque sur Free Fire."</p>
            <div className="review-author"><span className="avatar">KA</span><div><strong>Kouassi A.</strong><small>Abidjan</small></div></div>
          </div>
          <div className="review-card reveal" style={{transitionDelay: '.08s'}}>
            <div className="stars">★★★★★</div>
            <p>"Je génère mes miniatures et mes scripts TikTok en 5 minutes chrono. Ma chaîne a explosé."</p>
            <div className="review-author"><span className="avatar">MD</span><div><strong>Mariam D.</strong><small>Bouaké</small></div></div>
          </div>
          <div className="review-card reveal" style={{transitionDelay: '.16s'}}>
            <div className="stars">★★★★★</div>
            <p>"Le paiement MTN Mobile Money a été instantané. Enfin un outil pensé pour les créateurs gaming africains."</p>
            <div className="review-author"><span className="avatar">YS</span><div><strong>Yao S.</strong><small>San-Pédro</small></div></div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section" id="faq">
        <div className="section-head reveal">
          <span className="eyebrow"><span className="eyebrow-dot"></span>Questions fréquentes</span>
          <h2 className="section-title">FAQ</h2>
        </div>

        <div className="faq-list reveal">
          <div className="faq-item">
            <button className="faq-q">
              <span>Quels jeux KellyIA couvre-t-il ?</span>
              <span className="faq-plus">+</span>
            </button>
            <div className="faq-a"><p>Free Fire, PUBG Mobile, Call of Duty Mobile, Fortnite et les principaux jeux mobiles et populaires en Afrique — avec du contenu enrichi en continu.</p></div>
          </div>
          <div className="faq-item">
            <button className="faq-q">
              <span>Ai-je besoin d'une carte bancaire ?</span>
              <span className="faq-plus">+</span>
            </button>
            <div className="faq-a"><p>Non. Vous pouvez vous abonner entièrement avec Wave, Orange Money ou MTN Mobile Money, sans carte bancaire ni compte à l'étranger.</p></div>
          </div>
          <div className="faq-item">
            <button className="faq-q">
              <span>La version gratuite suffit-elle ?</span>
              <span className="faq-plus">+</span>
            </button>
            <div className="faq-a"><p>Oui pour un usage quotidien de coaching (20 messages/mois inclus). L'offre Plus monte à 300 messages, 12 miniatures et 8 générations voix par mois.</p></div>
          </div>
          <div className="faq-item">
            <button className="faq-q">
              <span>Mes conversations sont-elles privées ?</span>
              <span className="faq-plus">+</span>
            </button>
            <div className="faq-a"><p>Oui. Vos échanges restent confidentiels et ne sont jamais revendus ni partagés avec des tiers.</p></div>
          </div>
          <div className="faq-item">
            <button className="faq-q">
              <span>Puis-je résilier mon abonnement à tout moment ?</span>
              <span className="faq-plus">+</span>
            </button>
            <div className="faq-a"><p>Oui, sans engagement. Vous pouvez arrêter votre abonnement Plus à tout moment depuis votre compte.</p></div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta-section">
        <div className="cta-glow"></div>
        <div className="cta-inner reveal">
          <h2>Prêt à passer au niveau supérieur ?</h2>
          <p>Rejoins des milliers de gamers et créateurs africains qui progressent avec KellyIA.</p>
          <Link href="/chat" className="btn btn-primary btn-lg">Commencer maintenant</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="logo"><img src="/branding/logo-k.png" alt="KellyIA" className="logo-mark" />KellyIA</Link>
            <p>L'IA gaming et créateur, pensée pour l'Afrique francophone.</p>
          </div>
          <div className="footer-col">
            <h4>Produit</h4>
            <a href="#fonctionnalites">Coaching gaming</a>
            <a href="#ia">Miniatures TikTok / YouTube</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#fonctionnalites">Scripts vidéo</a>
          </div>
          <div className="footer-col">
            <h4>Entreprise</h4>
            <a href="#">À propos</a>
            <a href="#faq">FAQ</a>
            <a href="#">CGU</a>
            <a href="#">Contact</a>
          </div>
          <div className="footer-col">
            <h4>Restez informé</h4>
            <p className="footer-news-text">Offres et nouveautés, sans spam.</p>
            <div className="footer-form">
              <input type="email" placeholder="votre@email.com" />
              <button type="button">→</button>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Kelly Gaming SARL — KellyIA. Tous droits réservés.</span>
          <div className="footer-socials">
            <a href="#" aria-label="Telegram">TG</a>
            <a href="#" aria-label="WhatsApp">WA</a>
            <a href="#" aria-label="Instagram">IG</a>
          </div>
        </div>
      </footer>


    </>
  );
}
