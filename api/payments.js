// api/payments.js
// Récupère les paiements stockés dans Vercel KV

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    // Récupérer l'historique (liste des paiements)
    const historique = await kv.lrange('paiements:historique', 0, 99) || [];

    // Parser les JSON strings
    const payments = historique.map(item => {
      try {
        return JSON.parse(item);
      } catch (e) {
        return null;
      }
    }).filter(p => p !== null);

    return res.status(200).json({
      success: true,
      count: payments.length,
      payments: payments
    });

  } catch (error) {
    console.error('[API] Erreur:', error);
    return res.status(200).json({
      success: true,
      count: 0,
      payments: []
    });
  }
}
