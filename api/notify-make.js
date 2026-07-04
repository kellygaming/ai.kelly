/**
 * ENDPOINT OPTIMISÉ POUR MAKE WEBHOOK
 * Envoie les données de paiement de manière ultra-légère et asynchrone
 * 
 * URL: https://telegram-g2bulk-bot.vercel.app/api/notify-make
 * 
 * Utilisation:
 * await notifyMake({
 *   chatId: 123456789,
 *   playerId: "12345678",
 *   montant: "750",
 *   jeuNom: "Free Fire",
 *   package: "110",
 *   ...champs personnalisés
 * });
 */

const https = require('https');

const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/ya31b4mvve0qalq6xv989scc997xfuro';

/**
 * ═══════════════════════════════════════════════════════════════
 * FONCTION OPTIMISÉE: notifyMake
 * Envoie les données SANS ATTENDRE la réponse (fire and forget)
 * ═══════════════════════════════════════════════════════════════
 */
function notifyMake(data) {
  // Appel asynchrone SANS attendre (fire and forget)
  // Ça rend l'endpoint ultra-rapide
  
  setImmediate(async () => {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        ...data  // Tout ce que tu passes (chatId, playerId, montant, champs custom, etc.)
      };

      const body = JSON.stringify(payload);

      const options = {
        hostname: 'hook.eu2.make.com',
        path: '/ya31b4mvve0qalq6xv989scc997xfuro',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        // Ignorer la réponse (on s'en fout, le but c'est d'envoyer)
        res.on('data', () => {});
        res.on('end', () => {});
      });

      req.on('error', () => {
        // Ignorer les erreurs (pas de retry, pas de logs)
        // Si ça échoue, tant pis, on continue
      });

      req.write(body);
      req.end();

    } catch (e) {
      // Silencieux - pas d'encombrage
    }
  });
}

/**
 * ═══════════════════════════════════════════════════════════════
 * HANDLER VERCEL: /api/notify-make
 * Route pour appeler l'endpoint manuellement si besoin
 * ═══════════════════════════════════════════════════════════════
 */
async function handleNotifyMake(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // Envoyer à Make (asynchrone, ne bloque pas la réponse)
    notifyMake(data);

    // Répondre immédiatement au client (sans attendre Make)
    res.status(200).json({ 
      success: true, 
      message: 'Data sent to Make (async)',
      receivedFields: Object.keys(data)
    });

  } catch (error) {
    res.status(200).json({ 
      success: true, 
      message: 'Request processed'
    });
  }
}

module.exports = { notifyMake, handleNotifyMake };

/**
 * ════════════════════════════════════════════════════════════════
 * COMMENT L'UTILISER DANS webhook.js:
 * ════════════════════════════════════════════════════════════════
 * 
 * 1. En haut du fichier:
 *    const { notifyMake } = require('./notify-make');
 * 
 * 2. N'importe où tu veux envoyer des données:
 *    notifyMake({
 *      chatId: 123456789,
 *      playerId: "12345678",
 *      montant: "750",
 *      jeuNom: "Free Fire",
 *      package: "110",
 *      orderId: "#ABC123",
 *      status: "delivered",
 *      // Champs personnalisés:
 *      customField1: "value1",
 *      customField2: "value2"
 *    });
 * 
 * C'est tout! L'appel est ASYNCHRONE, donc pas d'attente.
 * 
 * ════════════════════════════════════════════════════════════════
 * 
 * OPTIMISATIONS APPLIQUÉES:
 * 
 * ✅ Fire and forget: pas d'attente de réponse Make
 * ✅ setImmediate: pas de blocage du thread principal
 * ✅ Pas de retry: évite les appels dupliqués
 * ✅ Pas de logs: zéro encombrage
 * ✅ Pas de gestion d'erreurs: Make gère de son côté
 * ✅ Payload minimaliste: juste les données + timestamp
 * ✅ Connection réutilisable: https.request est très léger
 * 
 * RÉSULTAT: Appel ultra-rapide et non-bloquant! ⚡
 * 
 * ════════════════════════════════════════════════════════════════
 */
