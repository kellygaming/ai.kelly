/**
 * ENDPOINT ZAPIER — ULTRA-OPTIMISÉ
 * Envoie les données de paiement à Zapier
 * 
 * URL Zapier: https://hooks.zapier.com/hooks/catch/23961502/42odnck/
 * Fichier: api/zapier.js
 * 
 * Utilisation:
 * await sendToZapier({
 *   chatId: 123456789,
 *   playerId: "12345678",
 *   montant: "750",
 *   jeuNom: "Free Fire",
 *   ...champs personnalisés
 * });
 */

const https = require('https');

const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/23961502/42odnck/';

/**
 * ═══════════════════════════════════════════════════════════════
 * FONCTION OPTIMISÉE: sendToZapier
 * Fire and forget — ultra-rapide et asynchrone
 * ═══════════════════════════════════════════════════════════════
 */
function sendToZapier(data) {
  // Appel asynchrone SANS ATTENDRE (fire and forget)
  setImmediate(async () => {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        source: 'kellygame-bot',
        ...data
      };

      const body = JSON.stringify(payload);

      const options = {
        hostname: 'hooks.zapier.com',
        path: '/hooks/catch/23961502/42odnck/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => {});
      });

      req.on('error', () => {});

      req.write(body);
      req.end();

    } catch (e) {
      // Silencieux
    }
  });
}

/**
 * ═══════════════════════════════════════════════════════════════
 * HANDLER VERCEL: /api/zapier
 * Route pour appeler Zapier manuellement si besoin
 * ═══════════════════════════════════════════════════════════════
 */
async function handleZapier(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    // Envoyer à Zapier (asynchrone)
    sendToZapier(data);

    // Répondre immédiatement
    res.status(200).json({ 
      success: true, 
      message: 'Data sent to Zapier (async)',
      receivedFields: Object.keys(data)
    });

  } catch (error) {
    res.status(200).json({ 
      success: true, 
      message: 'Request processed'
    });
  }
}

module.exports = { sendToZapier, handleZapier };

/**
 * ════════════════════════════════════════════════════════════════
 * COMMENT L'UTILISER DANS webhook.js:
 * ════════════════════════════════════════════════════════════════
 * 
 * 1. En haut du fichier:
 *    const { sendToZapier } = require('./zapier');
 * 
 * 2. N'importe où tu veux envoyer des données:
 *    sendToZapier({
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
 * C'est tout! Asynchrone, pas d'attente.
 * 
 * ════════════════════════════════════════════════════════════════
 * 
 * OPTIMISATIONS:
 * ✅ Fire and forget: pas d'attente
 * ✅ Asynchrone: setImmediate
 * ✅ Pas de retry: évite duplication
 * ✅ Pas de logs: zéro encombrage
 * ✅ Accepte tous les champs
 * ✅ Ultra-rapide ⚡
 * 
 * ════════════════════════════════════════════════════════════════
 */
