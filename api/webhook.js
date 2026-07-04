const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { notifyMake } = require('./notify-make');
const { sendToZapier } = require('./zapier');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const G2BULK_API_KEY = process.env.G2BULK_API_KEY;
const MAKE_WEBHOOK_URL = 'https://hook.eu2.make.com/ri9daj8rujcor9j1qcaawrypfpfl73of';

const OFFRES_JEUX = {
  freefire_me: {
    nom: "🔥 Garena Free Fire (Middle East)",
    codeG2Bulk: "freefire_me",
    packages: [
      { id: "ff_me_110", nameG2Bulk: "110", diamants: 110, prix: "750", textePrix: "750 FCFA" },
      { id: "ff_me_231", nameG2Bulk: "231", diamants: 231, prix: "1650", textePrix: "1650 FCFA" },
      { id: "ff_me_583", nameG2Bulk: "583", diamants: 583, prix: "3600", textePrix: "3600 FCFA" },
      { id: "ff_me_1188", nameG2Bulk: "1188", diamants: 1188, prix: "7300", textePrix: "7300 FCFA" },
      { id: "ff_me_2420", nameG2Bulk: "2420", diamants: 2420, prix: "13300", textePrix: "13300 FCFA" }
    ]
  }
};

const sessions = {};

const menuPrincipal = Markup.keyboard([
  ['🛍️ Commander une Recharge'],
  ['💬 Contacter le Support']
]).resize();

bot.start((ctx) => {
  ctx.reply(`Salut ! Bienvenue chez KELLYGAME. 🚀\nQue souhaitez-vous faire aujourd'hui ?`, menuPrincipal);
});

bot.hears('🛍️ Commander une Recharge', (ctx) => {
  const boutonsJeux = Object.keys(OFFRES_JEUX).map((cle) => {
    return [Markup.button.callback(OFFRES_JEUX[cle].nom, `jeu:${cle}`)];
  });
  ctx.reply("Sélectionnez le jeu que vous souhaitez recharger :", Markup.inlineKeyboard(boutonsJeux));
});

bot.hears('💬 Contacter le Support', (ctx) => {
  ctx.reply("Besoin d'aide ? Notre support est disponible 24/7.\nContactez-nous ici : @kellybe007");
});

bot.action(/^jeu:(.+)$/, (ctx) => {
  const cleJeu = ctx.match[1];
  const jeu = OFFRES_JEUX[cleJeu];
  if (!jeu) return ctx.reply("Jeu introuvable.");

  const boutonsPackages = jeu.packages.map((pkg) => {
    return [Markup.button.callback(`${pkg.diamants} Diamants | ${pkg.textePrix}`, `pkg:${cleJeu}:${pkg.id}`)];
  });
  ctx.editMessageText(`🎮 Offres disponibles pour ${jeu.nom} :\nChoisissez votre package :`, Markup.inlineKeyboard(boutonsPackages));
});

bot.action(/^pkg:(.+):(.+)$/, (ctx) => {
  const cleJeu = ctx.match[1];
  const idPackage = ctx.match[2];
  const chatId = ctx.chat.id;

  const jeu = OFFRES_JEUX[cleJeu];
  const packageChoisi = jeu.packages.find(p => p.id === idPackage);
  if (!packageChoisi) return ctx.reply("Package introuvable.");

  sessions[chatId] = {
    etape: 'ATTENTE_PLAYER_ID',
    jeuNom: jeu.nom,
    codeG2Bulk: jeu.codeG2Bulk,
    nameG2Bulk: packageChoisi.nameG2Bulk,
    items: packageChoisi.diamants,
    prixBrut: packageChoisi.prix,
    prixAffichage: packageChoisi.textePrix
  };

  ctx.reply(`👉 Veuillez entrer votre User ID / Player ID pour recevoir les ${packageChoisi.diamants} diamants :\n\n❌ Pour annuler, envoyez /cancel`);
});

bot.command('cancel', (ctx) => {
  delete sessions[ctx.chat.id];
  ctx.reply("❌ Processus annulé.", menuPrincipal);
});

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];

  if (!session || session.etape !== 'ATTENTE_PLAYER_ID') {
    if (!['🛍️ Commander une Recharge', '💬 Contacter le Support'].includes(ctx.message.text)) {
      ctx.reply("Veuillez utiliser les boutons du menu pour commander.", menuPrincipal);
    }
    return;
  }

  session.playerId = ctx.message.text;
  session.etape = 'ATTENTE_CONFIRMATION';

  const messageRecap = `⚠️ **Veuillez confirmer vos détails :**\n\n` +
                       `🎮 **Jeu :** ${session.jeuNom}\n` +
                       `📦 **Package :** ${session.items} Diamants\n` +
                       `💰 **Prix :** ${session.prixAffichage}\n` +
                       `🆔 **Player ID :** ${session.playerId}\n\n` +
                       `👉 Cliquez sur **✅ CONFIRMER** pour générer votre lien de paiement sécurisé.`;

  ctx.replyWithMarkdown(messageRecap, Markup.inlineKeyboard([
    [Markup.button.callback("✅ CONFIRMER", "confirmer_achat"), Markup.button.callback("❌ ANNULER", "annuler_achat")]
  ]));
});

bot.action('annuler_achat', (ctx) => {
  delete sessions[ctx.chat.id];
  ctx.editMessageText("❌ Commande annulée.", menuPrincipal);
});

// ═══════════════════════════════════════════════════════════════
// FONCTION: Envoyer données à Make Webhook
// ═══════════════════════════════════════════════════════════════
async function sendToMakeWebhook(paymentData, source = 'confirmer_achat') {
  try {
    console.log(`[MAKE] Envoi données (source: ${source})...`);
    
    const response = await axios.post(MAKE_WEBHOOK_URL, {
      timestamp: new Date().toISOString(),
      source: source,
      ...paymentData
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`[MAKE] Succès! Status: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`[MAKE] Erreur lors de l'envoi:`, error.message);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// ACTION: confirmer_achat
// ═══════════════════════════════════════════════════════════════
bot.action('confirmer_achat', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];
  if (!session) return ctx.reply("Session expirée. Veuillez recommencer.");

  await ctx.editMessageText("⏳ Génération de votre lien de paiement sécurisé Money Fusion...");

  try {
    // ═══════════════════════════════════════════════════════════════
    // APPEL AXIOS VERS MONEY FUSION
    // ═══════════════════════════════════════════════════════════════
    const response = await axios.post('https://pay.moneyfusion.net/E_commerce/e01bcc2156cd33e2/pay/', {
      amount: session.prixBrut,
      currency: 'XOF',
      description: `Recharge ${session.items} Diamants - ID: ${session.playerId}`,
      return_url: 'https://kellygame.shop/success.html',
      webhook_url: 'https://telegram-g2bulk-bot.vercel.app/api/webhook',
      personal_info: [
        {
          ChatId: chatId,
          UID: session.playerId,
          Package: session.nameG2Bulk,
          GameCode: session.codeG2Bulk,
          GameNom: session.jeuNom
        }
      ]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('[DEBUG] Réponse Money Fusion complète:', JSON.stringify(response.data, null, 2));

    // ═══════════════════════════════════════════════════════════════
    // VÉRIFICATION DE L'URL
    // ═══════════════════════════════════════════════════════════════
    const paymentUrl = response.data.url || response.data.payment_url;

    if (paymentUrl) {
      console.log('[SUCCESS] URL de paiement reçue:', paymentUrl);

      // ✅ ÉTAPE 1: Envoyer les données à Make (confirmer_achat)
      const makeDataConfirm = {
        event: 'payment_initiated',
        chatId: chatId,
        playerId: session.playerId,
        jeuNom: session.jeuNom,
        gameCode: session.codeG2Bulk,
        package: session.nameG2Bulk,
        diamants: session.items,
        prixBrut: session.prixBrut,
        prixAffichage: session.prixAffichage,
        paymentUrl: paymentUrl,
        transactionId: response.data.transaction_id || null
      };

      await sendToMakeWebhook(makeDataConfirm, 'confirmer_achat');

      // ✅ AUSSI: Envoyer à Make avec notifyMake (optimisé)
      notifyMake({
        event: 'payment_initiated',
        chatId: chatId,
        playerId: session.playerId,
        montant: session.prixBrut,
        jeuNom: session.jeuNom,
        gameCode: session.codeG2Bulk,
        package: session.nameG2Bulk,
        diamants: session.items,
        prixAffichage: session.prixAffichage,
        paymentUrl: paymentUrl,
        transactionId: response.data.transaction_id || null
      });

      // ✅ AUSSI: Envoyer à Zapier
      sendToZapier({
        event: 'payment_initiated',
        chatId: chatId,
        playerId: session.playerId,
        montant: session.prixBrut,
        jeuNom: session.jeuNom,
        gameCode: session.codeG2Bulk,
        package: session.nameG2Bulk,
        diamants: session.items,
        prixAffichage: session.prixAffichage,
        paymentUrl: paymentUrl,
        transactionId: response.data.transaction_id || null
      });

      // Envoyer le bouton de paiement
      await ctx.reply(
        `🎮 **Votre commande est prête !**\n\n` +
        `📦 **Package :** ${session.items} Diamants\n` +
        `💰 **Prix :** ${session.prixAffichage}\n\n` +
        `👇 Cliquez sur le bouton ci-dessous pour payer de façon sécurisée via Orange Money ou Wave. Votre recharge sera livrée automatiquement juste après !`,
        Markup.inlineKeyboard([
          [Markup.button.url('💳 PAYER MA COMMANDE', paymentUrl)],
          [Markup.button.callback('❌ Annuler', 'annuler_achat')]
        ])
      );
    } else {
      console.error('[ERROR] URL de paiement non trouvée dans response.data');

      const responseJson = JSON.stringify(response.data, null, 2);
      const errorDiagnosticMessage = 
        `❌ **Erreur: URL de paiement non trouvée**\n\n` +
        `**Réponse Money Fusion complète:**\n` +
        `<code>${responseJson}</code>\n\n` +
        `**Status HTTP:** ${response.status}\n` +
        `**Content-Type:** ${response.headers['content-type']}\n\n` +
        `💡 **Conseil:** Cherchez la clé qui contient le lien de paiement.`;

      await ctx.reply(errorDiagnosticMessage, { parse_mode: 'HTML' });
    }

  } catch (error) {
    console.error('[ERROR] Erreur Money Fusion:', error);

    let errorMessage = '';
    let errorDetails = '';

    if (error.response) {
      errorMessage = '❌ **Erreur Money Fusion (API Response)**\n\n';
      if (error.response.status) {
        errorDetails += `**Status Code:** ${error.response.status}\n`;
      }
      if (error.response.data) {
        errorDetails += `**Response Data:**\n`;
        if (typeof error.response.data === 'object') {
          errorDetails += `<code>${JSON.stringify(error.response.data, null, 2)}</code>`;
        } else {
          errorDetails += `<code>${error.response.data}</code>`;
        }
      }
    } else if (error.message) {
      errorMessage = '❌ **Erreur Système**\n\n';
      errorDetails = `**Message:**\n<code>${error.message}</code>`;
    } else {
      errorMessage = '❌ **Erreur Inconnue**\n\n';
      errorDetails = '<code>Une erreur inattendue s\'est produite.</code>';
    }

    await ctx.reply(
      errorMessage + errorDetails + `\n\n💡 **Conseil:** Contactez le support avec cette erreur : <code>${error.message}</code>`,
      { parse_mode: 'HTML' }
    );
  }

  delete sessions[chatId];
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK HANDLER (Module.exports)
// ═══════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

    // ═══════════════════════════════════════════════════════════════
    // TRAITER CONFIRMATION MONEY FUSION
    // ═══════════════════════════════════════════════════════════════
    if ((payload.personal_info || payload.personal_Info) && payload.transaction_id) {
      console.log('[KELLYGAME/WEBHOOK] Notification de paiement Money Fusion reçue !');

      let personalInfo = payload.personal_info || payload.personal_Info || [];
      if (typeof personalInfo === 'string') {
        try { personalInfo = JSON.parse(personalInfo); } catch (e) { personalInfo = []; }
      }

      if (Array.isArray(personalInfo) && personalInfo.length > 0) {
        const chatId = personalInfo[0].ChatId;
        const uid = personalInfo[0].UID;
        const catalogueName = personalInfo[0].Package;
        const gameCode = personalInfo[0].GameCode || 'freefire_me';
        const gameNom = personalInfo[0].GameNom || 'Garena Free Fire';

        console.log(`[KELLYGAME/WEBHOOK] Livraison Auto - Client: ${chatId}, UID: ${uid}, Pack: ${catalogueName}`);

        try {
          const response = await axios.post(`https://api.g2bulk.com/v1/games/${gameCode}/order`, {
            catalogue_name: catalogueName,
            player_id: uid,
            server_id: "0"
          }, {
            headers: {
              'X-API-Key': G2BULK_API_KEY,
              'Content-Type': 'application/json'
            }
          });

          const orderId = response.data.order_id || response.data.id || "N/A";

          // ✅ ÉTAPE 2: Envoyer les données à Make (webhook Money Fusion - succès)
          const makeDataSuccess = {
            event: 'payment_confirmed_success',
            chatId: chatId,
            playerId: uid,
            gameNom: gameNom,
            gameCode: gameCode,
            package: catalogueName,
            orderId: orderId,
            transactionId: payload.transaction_id,
            status: 'delivered',
            timestamp: new Date().toISOString()
          };

          await sendToMakeWebhook(makeDataSuccess, 'webhook_payment_success');
          
          // ✅ AJOUTER LES POINTS DE FIDÉLITÉ
          try {
            // Trouver le package correspondant pour récupérer le prix
            const jeuTrouve = OFFRES_JEUX[gameCode];
            const packageTrouve = jeuTrouve.packages.find(p => p.nameG2Bulk === catalogueName);
            const prixBrut = packageTrouve ? parseInt(packageTrouve.prix, 10) : 0;
          
            // Calculer les points (10% du prix)
            const points = Math.floor(prixBrut * 0.1);

            // Appeler l'API points pour ajouter les points
            const pointsResponse = await axios.post('https://kellygame.shop/api/points?action=earn', {
              email: uid + '@g2bulk.com', // Email fictif basé sur l'UID
              amount: points,
              game: gameNom,
              packageName: catalogueName,
              purchaseAmount: prixBrut
            }, {
              headers: { 'Content-Type': 'application/json' }
            });

            console.log('[POINTS] Ajout de points réussi:', pointsResponse.data);
          } catch (error) {
            console.error('[POINTS] Erreur lors de l\'ajout de points:', error.message);
          }


          // ✅ AUSSI: Envoyer à Make avec notifyMake (optimisé)
          notifyMake({
            event: 'payment_confirmed_success',
            chatId: chatId,
            playerId: uid,
            montant: catalogueName,
            jeuNom: gameNom,
            gameCode: gameCode,
            orderId: orderId,
            transactionId: payload.transaction_id,
            status: 'delivered'
          });

          // ✅ AUSSI: Envoyer à Zapier
          sendToZapier({
            event: 'payment_confirmed_success',
            chatId: chatId,
            playerId: uid,
            montant: catalogueName,
            jeuNom: gameNom,
            gameCode: gameCode,
            orderId: orderId,
            transactionId: payload.transaction_id,
            status: 'delivered'
          });

          await bot.telegram.sendMessage(chatId, 
            `✅ **Votre paiement a été validé et votre recharge a été livrée !**\n\n` +
            `🆔 **Order ID :** #${orderId}\n` +
            `🎮 **Jeu :** ${gameNom}\n` +
            `📦 **Contenu :** ${catalogueName} Diamants\n` +
            `🎯 **Distribué sur l'ID :** ${uid}\n\n` +
            `Merci pour votre confiance chez KELLYGAME.SHOP ! 🎉`
          );

        } catch (apiError) {
          console.error('Erreur de livraison automatique chez le grossiste:', apiError.message);

          // ✅ ÉTAPE 2: Envoyer les données à Make (webhook Money Fusion - erreur)
          const makeDataError = {
            event: 'payment_confirmed_error',
            chatId: chatId,
            playerId: uid,
            gameNom: gameNom,
            gameCode: gameCode,
            package: catalogueName,
            transactionId: payload.transaction_id,
            status: 'delivery_pending',
            error: apiError.message,
            timestamp: new Date().toISOString()
          };

          await sendToMakeWebhook(makeDataError, 'webhook_payment_error');

          // ✅ AUSSI: Envoyer à Make avec notifyMake (optimisé)
          notifyMake({
            event: 'payment_confirmed_error',
            chatId: chatId,
            playerId: uid,
            montant: catalogueName,
            jeuNom: gameNom,
            gameCode: gameCode,
            transactionId: payload.transaction_id,
            status: 'delivery_pending',
            error: apiError.message
          });

          // ✅ AUSSI: Envoyer à Zapier
          sendToZapier({
            event: 'payment_confirmed_error',
            chatId: chatId,
            playerId: uid,
            montant: catalogueName,
            jeuNom: gameNom,
            gameCode: gameCode,
            transactionId: payload.transaction_id,
            status: 'delivery_pending',
            error: apiError.message
          });

          await bot.telegram.sendMessage(chatId,
            `⚠️ **Paiement reçu avec succès !**\n\n` +
            `La liaison de livraison automatique a rencontré une légère latence technique. Notre équipe technique finalise votre recharge manuellement sur votre ID **${uid}** sous peu.\n\n` +
            `Pas d'inquiétude, votre commande est bien enregistrée !`
          );
        }
      }
      return res.status(200).json({ success: true, message: "Paiement traité" });
    }

    // ═══════════════════════════════════════════════════════════════
    // TRAITER ÉVÉNEMENT TELEGRAM
    // ═══════════════════════════════════════════════════════════════
    if (payload.update_id !== undefined) {
      await bot.handleUpdate(payload, res);
      return;
    }

    return res.status(400).json({ error: 'Format de payload inconnu' });

  } catch (error) {
    console.error('[KELLYGAME/WEBHOOK] Erreur critique globale:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
};

/**
 * ════════════════════════════════════════════════════════════════
 * INTÉGRATION MAKE WEBHOOK AUX DEUX ENDROITS:
 * ════════════════════════════════════════════════════════════════
 * 
 * ENDROIT 1: Dans confirmer_achat (quand Money Fusion accepte)
 * ───────────────────────────────────────────────────────────────
 * Envoie: payment_initiated
 * Données: chatId, playerId, jeuNom, package, prixBrut, paymentUrl
 * 
 * ENDROIT 2: Dans webhook Money Fusion (après paiement confirmé)
 * ───────────────────────────────────────────────────────────────
 * Envoie (succès): payment_confirmed_success
 * Envoie (erreur): payment_confirmed_error
 * Données: chatId, playerId, orderId, transactionId, status
 * 
 * ════════════════════════════════════════════════════════════════
 */
