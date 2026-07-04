const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const G2BULK_API_KEY = process.env.G2BULK_API_KEY;

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

bot.action('confirmer_achat', async (ctx) => {
  const chatId = ctx.chat.id;
  const session = sessions[chatId];
  if (!session) return ctx.reply("Session expirée. Veuillez recommencer.");

  await ctx.editMessageText("⏳ Génération de votre lien de paiement sécurisé Money Fusion...");

  try {
    const response = await axios.post('https://pay.moneyfusion.net/E_commerce/e01bcc2156cd33e2/pay/', {
      amount: parseInt(session.prixBrut),
      currency: 'XOF',
      description: `Recharge ${session.items} Diamants - ID: ${session.playerId}`,
      return_url: 'https://kellygame.shop/success.html',
      webhook_url: 'https://telegram-g2bulk-bot.vercel.app/api/webhook',
      personal_info: JSON.stringify([
        {
          ChatId: chatId,
          UID: session.playerId,
          Package: session.nameG2Bulk,
          GameCode: session.codeG2Bulk,
          GameNom: session.jeuNom
        }
      ])
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    const paymentUrl = response.data.url || response.data.payment_url;

    if (paymentUrl) {
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
      throw new Error("L'URL de paiement n'a pas été retournée.");
    }
  } catch (error) {
    console.error('Erreur génération Money Fusion:', error.message);
    ctx.reply("❌ Une erreur est survenue lors de la création du lien de paiement. Veuillez réessayer ou contacter le support.");
  }

  delete sessions[chatId];
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;

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
          await bot.telegram.sendMessage(chatId,
            `⚠️ **Paiement reçu avec succès !**\n\n` +
            `La liaison de livraison automatique a rencontré une légère latence technique. Notre équipe technique finalise votre recharge manuellement sur votre ID **${uid}** sous peu.\n\n` +
            `Pas d'inquiétude, votre commande est bien enregistrée !`
          );
        }
      }
      return res.status(200).json({ success: true, message: "Paiement traité" });
    }

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
