"use client";

import { useEffect } from "react";
import Link from "next/link";
import "./landing.css";

export default function Home() {
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

    // ===== Effet "machine à écrire" pour le prompt IA =====
    const promptText = document.getElementById("promptText");
    if (promptText) {
      const prompts = [
        "un marché africain vibrant au coucher du soleil",
        "un logo moderne pour ma startup",
        "une illustration futuriste d'Abidjan",
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
        ["IA", "#ia"],
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
            <span className="logo-mark"></span>
            KellyIA
          </Link>
          <nav className="nav-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#ia">Génération d'images</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#avis">Avis</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-actions">
            <a href="#" className="btn btn-ghost">Se connecter</a>
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
              L'IA conçue pour l'Afrique
            </span>
            <h1 className="hero-title">
              Posez la question.<br />
              <span className="grad-text">Obtenez la réponse.</span>
            </h1>
            <p className="hero-sub">
              Discutez, résolvez des problèmes complexes et générez des images en quelques secondes.
              Sans carte bancaire : payez avec Wave, Orange Money ou MTN Mobile Money.
            </p>
            <div className="hero-actions">
              <Link href="/chat" className="btn btn-primary btn-lg">
                Commencer gratuitement
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
              <a href="#ia" className="btn btn-ghost btn-lg">Voir l'IA en action</a>
            </div>
            <div className="hero-trust">
              <div className="trust-item"><strong>50K+</strong><span>Questions résolues</span></div>
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
                <span className="oc-icon">💬</span>
                <div><strong>Réponse claire</strong><small>en 3 secondes</small></div>
              </div>
              <div className="orb-card oc-2">
                <span className="oc-icon">✓</span>
                <div><strong>Wave / MTN</strong><small>Sans carte bancaire</small></div>
              </div>
              <div className="orb-card oc-3">
                <span className="oc-icon">🖼️</span>
                <div><strong>Image générée</strong><small>à l'instant</small></div>
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
            <span>Chat intelligent</span><span>•</span><span>Génération d'images</span><span>•</span>
            <span>Résolution de problèmes</span><span>•</span><span>Rédaction</span><span>•</span>
            <span>Code</span><span>•</span><span>Traduction</span><span>•</span>
            <span>Chat intelligent</span><span>•</span><span>Génération d'images</span><span>•</span>
            <span>Résolution de problèmes</span><span>•</span><span>Rédaction</span><span>•</span>
            <span>Code</span><span>•</span><span>Traduction</span><span>•</span>
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
              Propulsé par l'intelligence artificielle
            </span>
            <h2 className="section-title">Crée tes images<br /><span className="grad-text-2">avec l'IA</span></h2>
            <p className="section-sub">
              Génère des visuels ultra réalistes en quelques secondes.
              Décris ton idée, l'IA fait le reste.
            </p>
          </div>

          <div className="ia-console reveal" style={{transitionDelay: '.1s'}}>
            {/* interface holographique */}
            <div className="holo-beam"></div>
            <div className="console-card">
              <div className="console-top">
                <div className="console-dots"><span></span><span></span><span></span></div>
                <span className="console-label">kellyia.ai — génération en direct</span>
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
                  <div className="gen-card gen-ready gr-1">
                    <div className="gen-thumb thumb-a"></div>
                    <span className="gen-tag gen-tag-ok">✓ Prêt</span>
                  </div>
                  <div className="gen-card gen-ready gr-2">
                    <div className="gen-thumb thumb-b"></div>
                    <span className="gen-tag gen-tag-ok">✓ Prêt</span>
                  </div>
                </div>
              </div>

              <div className="console-footer">
                <div className="mini-stat"><strong>2.4s</strong><small>Temps moyen</small></div>
                <div className="mini-stat"><strong>4K</strong><small>Résolution</small></div>
                <div className="mini-stat"><strong>∞</strong><small>Styles</small></div>
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

            <div className="ia-badge badge-1">IA générative</div>
            <div className="ia-badge badge-2">Ultra réaliste</div>
            <div className="ia-badge badge-3">Temps réel</div>
          </div>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section className="products-section" id="fonctionnalites">
        <div className="ambient-icon ai-1">💬</div>
        <div className="ambient-icon ai-2">🖼️</div>
        <div className="ambient-icon ai-3">✍️</div>
        <div className="section-head reveal">
          <span className="eyebrow"><span className="eyebrow-dot"></span>Ce que vous pouvez faire</span>
          <h2 className="section-title">Une IA, toutes les réponses</h2>
          <p className="section-sub">Un seul assistant pour discuter, résoudre, créer et écrire.</p>
        </div>

        <div className="products-grid">
          <div className="product-card reveal" style={{transitionDelay: '.05s'}}>
            <div className="product-glow pg-orange"></div>
            <div className="product-icon">💬</div>
            <h3>Chat intelligent</h3>
            <p>Posez n'importe quelle question, obtenez une réponse claire et sourcée.</p>
            <div className="product-meta"><span>Gratuit pour commencer</span><span className="tag">Populaire</span></div>
          </div>
          <div className="product-card reveal" style={{transitionDelay: '.1s'}}>
            <div className="product-glow pg-red"></div>
            <div className="product-icon">🧠</div>
            <h3>Problèmes complexes</h3>
            <p>Maths, droit, business, technique — l'IA raisonne étape par étape avec vous.</p>
            <div className="product-meta"><span>Illimité en abonnement</span></div>
          </div>
          <div className="product-card reveal" style={{transitionDelay: '.15s'}}>
            <div className="product-glow pg-blue"></div>
            <div className="product-icon">🖼️</div>
            <h3>Génération d'images</h3>
            <p>Décrivez une image, l'IA la crée en quelques secondes.</p>
            <div className="product-meta"><span>Dès l'offre Plus</span></div>
          </div>
          <div className="product-card reveal" style={{transitionDelay: '.2s'}}>
            <div className="product-glow pg-purple"></div>
            <div className="product-icon">✍️</div>
            <h3>Rédaction & code</h3>
            <p>Emails, documents, scripts — rédigés et corrigés en un instant.</p>
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
            <h3>Réponses instantanées</h3>
            <p>Une réponse claire en quelques secondes, 24h/24, où que vous soyez.</p>
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
                <li>Chat illimité</li>
                <li>Réponses rapides</li>
                <li>Historique 7 jours</li>
              </ul>
              <Link href="/chat" className="btn btn-ghost price-btn">Commencer</Link>
            </div>
            <div className="price-card price-card-featured">
              <span className="price-tag price-tag-featured">Plus</span>
              <div className="price-amount">2 500 <small>FCFA / mois</small></div>
              <p className="price-desc">Pour ceux qui veulent tout, sans limite.</p>
              <ul className="price-list">
                <li>Chat illimité et prioritaire</li>
                <li>Génération d'images illimitée</li>
                <li>Résolution de problèmes avancés</li>
                <li>Historique illimité</li>
              </ul>
              <Link href="/chat" className="btn btn-primary price-btn">S'abonner</Link>
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
            <span>Questions résolues</span>
          </div>
          <div className="stat reveal" style={{transitionDelay: '.06s'}}>
            <strong className="stat-num" data-target="12000">0</strong>
            <span>Images générées</span>
          </div>
          <div className="stat reveal" style={{transitionDelay: '.12s'}}>
            <strong className="stat-num" data-target="99">0</strong>
            <span>% de disponibilité</span>
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
            <h3>Posez votre question</h3>
            <p>Écrivez librement, comme à un ami — l'IA comprend le contexte.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step reveal" style={{transitionDelay: '.08s'}}>
            <span className="step-num">02</span>
            <h3>Obtenez une réponse</h3>
            <p>Réponse claire en quelques secondes, avec explications si besoin.</p>
          </div>
          <div className="step-connector"></div>
          <div className="step reveal" style={{transitionDelay: '.16s'}}>
            <span className="step-num">03</span>
            <h3>Passez à l'offre Plus</h3>
            <p>Débloquez la génération d'images et le mode avancé.</p>
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
            <p>"J'ai enfin une IA qui répond vite et que je peux payer avec mon Wave, sans galère de carte bancaire."</p>
            <div className="review-author"><span className="avatar">KA</span><div><strong>Kouassi A.</strong><small>Abidjan</small></div></div>
          </div>
          <div className="review-card reveal" style={{transitionDelay: '.08s'}}>
            <div className="stars">★★★★★</div>
            <p>"J'utilise KellyIA pour rédiger mes rapports et générer des visuels pour mon business. Un gain de temps énorme."</p>
            <div className="review-author"><span className="avatar">MD</span><div><strong>Mariam D.</strong><small>Bouaké</small></div></div>
          </div>
          <div className="review-card reveal" style={{transitionDelay: '.16s'}}>
            <div className="stars">★★★★★</div>
            <p>"Le paiement MTN Mobile Money a été instantané. Enfin un outil pensé pour nous."</p>
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
            <div className="faq-a"><p>Oui pour un usage quotidien de chat. L'offre Plus débloque la génération d'images illimitée et la résolution de problèmes avancés.</p></div>
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
          <h2>Prêt à obtenir des réponses ?</h2>
          <p>Rejoignez des milliers d'Africains qui utilisent KellyIA au quotidien.</p>
          <Link href="/chat" className="btn btn-primary btn-lg">Commencer maintenant</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div className="footer-brand">
            <Link href="/" className="logo"><span className="logo-mark"></span>KellyIA</Link>
            <p>L'intelligence artificielle pensée pour l'Afrique francophone.</p>
          </div>
          <div className="footer-col">
            <h4>Produit</h4>
            <a href="#fonctionnalites">Chat intelligent</a>
            <a href="#ia">Génération d'images</a>
            <a href="#tarifs">Tarifs</a>
            <a href="#fonctionnalites">Rédaction & code</a>
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
