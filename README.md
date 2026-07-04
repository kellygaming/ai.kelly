# KellyIA — Site complet (accueil + assistant IA)

Site KellyIA : une landing page premium sur `/` et un assistant IA conversationnel sur `/chat`.
Cliquer sur n'importe quel bouton "Commencer" de la page d'accueil envoie directement vers `/chat`.
Aucune connexion visiteur nécessaire — la clé API Claude reste côté serveur, jamais exposée au navigateur.

## Structure

```
app/
  page.tsx          → page d'accueil (/) : hero, IA, fonctionnalités, tarifs, avis, FAQ
  landing.css        → styles de la page d'accueil
  chat/page.tsx      → interface de conversation (/chat)
  api/chat/route.ts  → route serveur qui appelle l'API Claude (clé protégée)
  globals.css         → styles partagés (polices, reset, animations communes)
  layout.tsx          → layout racine (titre du site, police, fond)
```

## 1. Tester en local

```bash
npm install
cp .env.example .env.local
# puis remplace la clé dans .env.local par ta vraie clé ANTHROPIC_API_KEY
npm run dev
```

Ouvre http://localhost:3000 (page d'accueil) et http://localhost:3000/chat (assistant).

## 2. Publier sur GitHub

```bash
git init
git add .
git commit -m "Site KellyIA"
git branch -M main
git remote add origin https://github.com/TON-USER/TON-REPO.git
git push -u origin main
```

⚠️ Ne commit jamais `.env.local` — il est déjà exclu via `.gitignore`.

## 3. Héberger sur Vercel

1. Va sur vercel.com → **New Project** → importe ton repo GitHub.
2. Vérifie que **Framework Preset** est bien réglé sur **Next.js** (pas "Other").
3. Vérifie que **Root Directory** pointe vers le dossier qui contient `package.json` (racine du repo si tu n'as pas de sous-dossier).
4. Avant de déployer (ou dans **Settings → Environment Variables** après coup) :
   - Nom : `ANTHROPIC_API_KEY`
   - Valeur : ta clé API Claude (commence par `sk-ant-...`)
   - Environnements : coche Production, Preview et Development
5. Clique **Deploy**.

## Personnalisation rapide

- **Textes / sections de la page d'accueil** : `app/page.tsx`
- **Couleurs de la page d'accueil** : variables `:root` en haut de `app/landing.css`
- **Couleurs de l'interface de chat** : `tailwind.config.js` (`accent`, `pink`, `accent2`, etc.)
- **Ton de l'IA / instructions** : `SYSTEM_PROMPT` dans `app/api/chat/route.ts`
- **Modèle utilisé** : le champ `model` dans le même fichier (actuellement `claude-sonnet-5`)

## Ce qui n'est pas encore branché

- Le bouton **"S'abonner"** (offre Plus) redirige vers `/chat` pour l'instant, faute de système de paiement Wave/Orange Money/MTN branché — à connecter quand tu seras prêt.
- Le formulaire newsletter du footer est visuel uniquement (pas encore relié à un service d'envoi d'emails).
- Pas d'historique de conversation persistant, pas de comptes utilisateurs, pas de génération d'images réelle (le bloc IA de la page d'accueil est une démonstration animée).
- Pas de limite de débit (rate limiting) sur l'API — à ajouter avant un fort trafic public, pour éviter des coûts imprévus.
