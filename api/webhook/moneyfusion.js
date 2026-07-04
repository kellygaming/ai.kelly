/**
 * Webhook Money Fusion pour KELLYGAME.SHOP
 * Gère la validation du paiement et déclenche la livraison automatique
 * Intégration: KELLYGAME/PARTNERSHIP
 */

const https = require('https');

// ═══════════════════════════════════════════════════════════════
// CATALOGUE ÉVOLUTIF - Structure pour tous les jeux
// ═══════════════════════════════════════════════════════════════
const GAME_CATALOG = {
  'Free Fire': {
    apiCode: 'freefire_me',
    serverId: '0',
    packs: {
      'Free Fire – 110 Jetons': '110',
      'Free Fire – 231 Jetons': '231',
      'Free Fire – 341 Jetons': '341',
      'Free Fire – 462 Jetons': '462',
      'Free Fire – 583 Jetons': '583',
      'Free Fire – 814 Jetons': '814',
      'Free Fire – 1 045 Jetons': '1045',
      'Free Fire – 1 771 Jetons': '1771',
      'Free Fire – 2 420 Jetons': '2420',
      'Free Fire – Abonnement Semaine': 'ABONNEMENT_SEMAINE',
      'Free Fire – Abonnement Mois': 'ABONNEMENT_MOIS',
      'Free Fire – Abonnement Mois + Semaine': 'ABONNEMENT_MOIS_SEMAINE'
    }
  },
  'PUBG Mobile': {
    apiCode: 'pubg_mobile',
    serverId: '0',
    packs: {
      'PUBG Mobile – 60 UC': '60',
      'PUBG Mobile – First Pack': 'FIRST_PACK',
      'PUBG Mobile – 325 UC': '325',
      'PUBG Mobile – 660 UC': '660',
      'PUBG Mobile – 985 UC': '985'
    }
  },
  'Roblox': {
    apiCode: 'roblox',
    serverId: '0',
    packs: {
      'Roblox – 800 Robux': '800',
      'Roblox – 1 600 Robux': '1600',
      'Roblox – 2 000 Robux': '2000',
      'Roblox – 2 800 Robux': '2800',
      'Roblox – 4 500 Robux': '4500',
      'Roblox – 10 000 Robux': '10000'
    }
  },
  'Bloodstrike': {
    apiCode: 'bloodstrike',
    serverId: '0',
    packs: {
      'Bloodstrike – 51 GC': '51',
      'Bloodstrike – 105 GC': '105',
      'Bloodstrike – 320 GC': '320',
      'Bloodstrike – 540 GC': '540',
      'Bloodstrike – 860 GC': '860',
      'Bloodstrike – 1 100 GC': '1100'
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// MAPPING: "CARTE CADEAU XXX" ↔ Noms de produits réels
// ═══════════════════════════════════════════════════════════════
const MONEY_FUSION_MAPPING = {
  'CARTE CADEAU 110': 'Free Fire – 110 Jetons',
  'CARTE CADEAU 231': 'Free Fire – 231 Jetons',
  'CARTE CADEAU 341': 'Free Fire – 341 Jetons',
  'CARTE CADEAU 462': 'Free Fire – 462 Jetons',
  'CARTE CADEAU 583': 'Free Fire – 583 Jetons',
  'CARTE CADEAU 814': 'Free Fire – 814 Jetons',
  'CARTE CADEAU 1045': 'Free Fire – 1 045 Jetons',
  'CARTE CADEAU 1771': 'Free Fire – 1 771 Jetons',
  'CARTE CADEAU 2420': 'Free Fire – 2 420 Jetons',
  'CARTE CADEAU ABONNEMENT_SEMAINE': 'Free Fire – Abonnement Semaine',
  'CARTE CADEAU ABONNEMENT_MOIS': 'Free Fire – Abonnement Mois',
  'CARTE CADEAU ABONNEMENT_MOIS_SEMAINE': 'Free Fire – Abonnement Mois + Semaine'
};

// ═══════════════════════════════════════════════════════════════
// FONCTION: Parser le payload Money Fusion et extraire les infos
// ═══════════════════════════════════════════════════════════════
function parseMoneyFusionPayload(payload) {
  try {
    // Personal info peut être un string ou un array
    let personalInfo = payload.personal_info || payload.personal_Info || [];
    
    // Si c'est un string JSON, parser le
    if (typeof personalInfo === 'string') {
      try {
        personalInfo = JSON.parse(personalInfo);
      } catch (e) {
        console.error('[KELLYGAME/PARTNERSHIP] Failed to parse personal_info:', e);
        personalInfo = [];
      }
    }

    // Extraire UID et Article du tableau
    let uid = null;
    let transformedArticle = null;

    if (Array.isArray(personalInfo) && personalInfo.length > 0) {
      uid = personalInfo[0].UID || personalInfo[0].uid || null;
      transformedArticle = personalInfo[0].Article || personalInfo[0].article || null;
    }

    return {
      uid,
      transformedArticle,
      rawPayload: payload
    };
  } catch (error) {
    console.error('[KELLYGAME/PARTNERSHIP] Error parsing Money Fusion payload:', error);
    return {
      uid: null,
      transformedArticle: null,
      rawPayload: payload
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// FONCTION: Convertir "CARTE CADEAU 110" en "Free Fire – 110 Jetons"
// ═══════════════════════════════════════════════════════════════
function mapArticleFromMoneyFusion(transformedArticle) {
  // Chercher dans le mapping
  if (MONEY_FUSION_MAPPING[transformedArticle]) {
    return MONEY_FUSION_MAPPING[transformedArticle];
  }

  // Si pas trouvé, retourner null (article inconnu)
  console.warn(`[KELLYGAME/PARTNERSHIP] Article not found in mapping: ${transformedArticle}`);
  return null;
}

// ═══════════════════════════════════════════════════════════════
// FONCTION: Déterminer le jeu à partir du nom de l'article
// ═══════════════════════════════════════════════════════════════
function getGameFromArticle(articleName) {
  for (const [gameName, config] of Object.entries(GAME_CATALOG)) {
    if (config.packs[articleName]) {
      return gameName;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// FONCTION: Effectuer une requête API vers G2BULK
// ═══════════════════════════════════════════════════════════════
function callG2BulkAPI(gameCode, catalogueName, playerId) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.G2BULK_API_KEY;
    
    if (!apiKey) {
      reject(new Error('G2BULK API Key not configured'));
      return;
    }

    const body = JSON.stringify({
      catalogue_name: catalogueName,
      player_id: playerId,
      server_id: '0'
    });

    const options = {
      hostname: 'api.g2bulk.com',
      path: `/v1/games/${gameCode}/order`,
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonResponse
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════
// FONCTION: Logger les transactions
// ═══════════════════════════════════════════════════════════════
function logTransaction(status, details) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    status,
    provider: 'KELLYGAME/PARTNERSHIP',
    details: {
      game: details.game || 'Unknown',
      catalogueName: details.catalogueName || 'Unknown',
      orderId: details.orderId || 'N/A',
      apiStatus: details.apiStatus || 'Pending',
      errorMessage: details.errorMessage || null
    }
  };

  console.log(JSON.stringify(logEntry));
}

// ═══════════════════════════════════════════════════════════════
// FONCTION: Traiter le paiement Money Fusion
// ═══════════════════════════════════════════════════════════════
async function processPayment(moneyFusionPayload) {
  try {
    // Parser le payload Money Fusion
    const { uid, transformedArticle, rawPayload } = parseMoneyFusionPayload(moneyFusionPayload);

    console.log(`[KELLYGAME/PARTNERSHIP] Processing Money Fusion webhook`);
    console.log(`[KELLYGAME/PARTNERSHIP] Extracted UID: ${uid}, Article: ${transformedArticle}`);

    // Valider UID et article
    if (!uid || !transformedArticle) {
      throw new Error('Missing UID or Article in personal_info');
    }

    // Mapper l'article Money Fusion vers le nom réel
    const articleName = mapArticleFromMoneyFusion(transformedArticle);
    if (!articleName) {
      throw new Error(`Article mapping failed for: ${transformedArticle}`);
    }

    console.log(`[KELLYGAME/PARTNERSHIP] Mapped article: ${transformedArticle} → ${articleName}`);

    // Déterminer le jeu
    const game = getGameFromArticle(articleName);
    if (!game) {
      throw new Error(`Game not found for article: ${articleName}`);
    }

    console.log(`[KELLYGAME/PARTNERSHIP] Detected game: ${game}`);

    // Récupérer la config du jeu
    const gameConfig = GAME_CATALOG[game];
    const catalogueName = gameConfig.packs[articleName];

    // Vérifier que le catalogue_name n'est pas une valeur fictive
    if (catalogueName.includes('À remplir') || catalogueName.startsWith('ABONNEMENT_')) {
      logTransaction('PENDING_CONFIG', {
        game,
        catalogueName,
        orderId: rawPayload.transaction_id || 'N/A',
        errorMessage: 'Pack code not configured yet'
      });

      return {
        success: false,
        status: 'pending_config',
        message: 'Cette recharge sera complétée manuellement par notre équipe.',
        orderId: rawPayload.transaction_id
      };
    }

    // Appeler l'API G2BULK
    console.log(`[KELLYGAME/PARTNERSHIP] Calling G2BULK API: ${gameConfig.apiCode} with catalogue: ${catalogueName}`);
    const apiResponse = await callG2BulkAPI(gameConfig.apiCode, catalogueName, uid);

    // Vérifier la réponse
    if (apiResponse.statusCode >= 200 && apiResponse.statusCode < 300) {
      logTransaction('SUCCESS', {
        game,
        catalogueName,
        orderId: rawPayload.transaction_id || 'N/A',
        apiStatus: 'Delivered'
      });

      return {
        success: true,
        status: 'delivered',
        message: 'Votre recharge a été livrée avec succès ! 🎉',
        orderId: rawPayload.transaction_id
      };
    } else {
      logTransaction('API_ERROR', {
        game,
        catalogueName,
        orderId: rawPayload.transaction_id || 'N/A',
        apiStatus: `HTTP ${apiResponse.statusCode}`,
        errorMessage: JSON.stringify(apiResponse.data)
      });

      return {
        success: false,
        status: 'delivery_pending',
        message: 'Votre paiement a été validé, mais la livraison automatique a rencontré une latence. Notre équipe technique finalise votre recharge manuellement sous peu. En cas de besoin, contactez le support avec votre ID de transaction.',
        orderId: rawPayload.transaction_id,
        apiError: apiResponse.data
      };
    }
  } catch (error) {
    console.error('[KELLYGAME/PARTNERSHIP] Error processing payment:', error.message);

    logTransaction('ERROR', {
      game: 'Unknown',
      catalogueName: 'Unknown',
      orderId: moneyFusionPayload.transaction_id || 'Unknown',
      errorMessage: error.message
    });

    return {
      success: false,
      status: 'error',
      message: 'Votre paiement a été validé, mais la livraison automatique a rencontré une latence. Notre équipe technique finalise votre recharge manuellement sous peu. En cas de besoin, contactez le support avec votre ID de transaction.',
      orderId: moneyFusionPayload.transaction_id,
      error: error.message
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// HANDLER VERCEL
// ═══════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const moneyFusionPayload = req.body;

    console.log('[KELLYGAME/PARTNERSHIP] Received webhook payload');

    // Traiter le paiement
    const result = await processPayment(moneyFusionPayload);

    // Répondre au webhook
    res.status(200).json(result);
  } catch (error) {
    console.error('[KELLYGAME/PARTNERSHIP] Webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// STRUCTURE DU PAYLOAD ATTENDU DE MONEY FUSION:
// ═══════════════════════════════════════════════════════════════
/*
{
  "transaction_id": "TXN_123456",
  "personal_info": [
    {
      "UID": "12345678",
      "Article": "CARTE CADEAU 110"
    }
  ],
  "amount": 800,
  "currency": "XOF",
  ...autres champs Money Fusion
}
*/
