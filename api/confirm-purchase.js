/**
 * FONCTION BOT TELEGRAM: confirmer_achat
 * Appelle Money Fusion pour générer un lien de paiement
 * Envoie le lien sous forme de bouton inline cliquable
 * 
 * Cette fonction remplace l'ancien appel G2BULK direct
 */

const https = require('https');

// ═══════════════════════════════════════════════════════════════
// FONCTION: Appeler Money Fusion pour générer lien de paiement
// ═══════════════════════════════════════════════════════════════
async function generateMoneyFusionPaymentLink(price, playerId, packageName, chatId) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      amount: price,
      currency: 'XOF',
      description: `Recharge ${packageName}`,
      personal_info: JSON.stringify([
        {
          UID: playerId,
          Package: packageName,
          ChatId: chatId
        }
      ]),
      return_url: 'https://kellygame.shop/success.html'
    });

    const options = {
      hostname: 'pay.moneyfusion.net',
      path: '/E_commerce/e01bcc2156cd33e2/pay/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log('[BOT/MONEY_FUSION] Generating payment link...');

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
// FONCTION: Envoyer message Telegram avec bouton inline
// ═══════════════════════════════════════════════════════════════
async function sendTelegramPaymentButton(bot, chatId, paymentUrl, packageName, price) {
  try {
    const inlineKeyboard = {
      inline_keyboard: [
        [
          {
            text: '💳 PAYER MA COMMANDE',
            url: paymentUrl
          }
        ],
        [
          {
            text: '❌ Annuler',
            callback_data: 'cancel_payment'
          }
        ]
      ]
    };

    const message = `
🎮 <b>Préparez-vous à recharger!</b>

📦 <b>Détails de votre commande:</b>
• Package: <code>${packageName}</code>
• Prix: <b>${price} FCFA</b>

✅ Cliquez sur le bouton ci-dessous pour procéder au paiement.

Une fois le paiement confirmé, votre recharge sera livrée automatiquement! ⚡
    `.trim();

    await bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard
    });

    console.log(`[BOT] Payment button sent to ${chatId}`);
    return true;
  } catch (error) {
    console.error('[BOT] Error sending payment button:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// FONCTION: confirmer_achat (À INTÉGRER DANS BOT TELEGRAM)
// ═══════════════════════════════════════════════════════════════
async function confirmer_achat(bot, msg, session) {
  const chatId = msg.chat.id;

  try {
    // Vérifier que les infos requises sont dans la session
    if (!session.playerId || !session.selectedPackage || !session.selectedPrice) {
      return bot.sendMessage(
        chatId,
        '❌ Erreur: Informations manquantes. Veuillez recommencer.'
      );
    }

    console.log(`[BOT] confirmer_achat called - UID: ${session.playerId}, Package: ${session.selectedPackage}`);

    // Afficher le message "en cours..."
    await bot.sendMessage(
      chatId,
      '⏳ Génération du lien de paiement en cours...'
    );

    // Appeler Money Fusion pour générer le lien de paiement
    const moneyFusionResponse = await generateMoneyFusionPaymentLink(
      session.selectedPrice,    // Prix FCFA
      session.playerId,         // UID du joueur
      session.selectedPackage,  // Nom du package
      chatId                    // Chat ID Telegram
    );

    // Vérifier la réponse
    if (moneyFusionResponse.statusCode >= 200 && moneyFusionResponse.statusCode < 300) {
      const paymentUrl = moneyFusionResponse.data.url || moneyFusionResponse.data.payment_url;

      if (paymentUrl) {
        // Succès! Envoyer le bouton de paiement
        console.log('[BOT] Money Fusion link generated successfully');

        // Supprimer le message "en cours..."
        try {
          await bot.deleteMessage(chatId, msg.message_id);
        } catch (e) {
          // Ignorer les erreurs de suppression
        }

        // Envoyer le bouton de paiement
        await sendTelegramPaymentButton(
          bot,
          chatId,
          paymentUrl,
          session.selectedPackage,
          session.selectedPrice
        );

        // Mettre à jour la session
        session.paymentUrl = paymentUrl;
        session.paymentInitiated = true;

        return;
      } else {
        throw new Error('Payment URL not found in Money Fusion response');
      }
    } else {
      throw new Error(`Money Fusion error: HTTP ${moneyFusionResponse.statusCode}`);
    }
  } catch (error) {
    console.error('[BOT] Error in confirmer_achat:', error);

    await bot.sendMessage(
      chatId,
      `❌ Erreur lors de la génération du lien de paiement:\n<code>${error.message}</code>`,
      { parse_mode: 'HTML' }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILISATION DANS BOT TELEGRAM (exemple):
// ═══════════════════════════════════════════════════════════════
/*

// Dans votre fichier bot.js ou index.js:

const TelegramBot = require('node-telegram-bot-api');
const { confirmer_achat } = require('./api/confirm-purchase');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

// Quand client clique sur "Confirmer l'achat":
bot.onText(/confirmer_achat/, async (msg) => {
  const chatId = msg.chat.id;
  const session = sessions[chatId]; // Votre système de session
  
  await confirmer_achat(bot, msg, session);
});

// Gérer les appels Money Fusion (callback)
bot.on('callback_query', (query) => {
  if (query.data === 'cancel_payment') {
    bot.answerCallbackQuery(query.id, '❌ Paiement annulé');
    bot.sendMessage(query.message.chat.id, 'Votre commande a été annulée.');
  }
});

*/

// ═══════════════════════════════════════════════════════════════
// FLUX COMPLET:
// ═══════════════════════════════════════════════════════════════
/*

1️⃣ Client remplit UID + sélectionne package
   ↓
2️⃣ Client clique "Confirmer l'achat"
   ↓
3️⃣ confirmer_achat() appelée
   ↓
4️⃣ Appel Money Fusion API
   ↓
5️⃣ Money Fusion retourne lien de paiement
   ↓
6️⃣ Bot envoie bouton inline "💳 PAYER MA COMMANDE"
   ↓
7️⃣ Client clique → Ouverture Money Fusion
   ↓
8️⃣ Client paie
   ↓
9️⃣ Money Fusion confirme → Webhook Vercel
   ↓
🔟 webhook.js reçoit confirmation
   ↓
1️⃣1️⃣ Extrait ChatId, UID, Package
   ↓
1️⃣2️⃣ Appelle G2BULK pour livraison
   ↓
1️⃣3️⃣ Envoie message Telegram au client ✅

*/

module.exports = { confirmer_achat, generateMoneyFusionPaymentLink, sendTelegramPaymentButton };
