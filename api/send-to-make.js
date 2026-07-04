/**
 * Endpoint API pour envoyer les données de paiement à Make
 * URL: https://kellygame.shop/api/send-to-make
 */

const https = require('https');

/**
 * Envoyer les données à Make Webhook
 */
function sendToMakeWebhook(paymentData) {
  return new Promise((resolve, reject) => {
    const makeWebhookUrl = 'https://hook.eu2.make.com/ri9daj8rujcor9j1qcaawrypfpfl73of';

    const body = JSON.stringify(paymentData);

    const url = new URL(makeWebhookUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    console.log('[KELLYGAME.SHOP] Sending data to Make webhook...');

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`[KELLYGAME.SHOP] Make webhook response: ${res.statusCode}`);
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      console.error('[KELLYGAME.SHOP] Make webhook error:', error);
      reject(error);
    });

    req.write(body);
    req.end();
  });
}

/**
 * Handler Vercel
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const paymentData = req.body;

    console.log('[KELLYGAME.SHOP] Received payment data, forwarding to Make...');

    // Envoyer à Make
    const makeResponse = await sendToMakeWebhook(paymentData);

    // Répondre au client
    res.status(200).json({
      success: true,
      message: 'Data sent to Make successfully',
      makeStatus: makeResponse.statusCode
    });
  } catch (error) {
    console.error('[KELLYGAME.SHOP] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send data to Make'
    });
  }
};

/**
 * UTILISATION DEPUIS LE NAVIGATEUR:
 * 
 * fetch('/api/send-to-make', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     client_name: "Jean Dupont",
 *     client_phone: "07 50 12 34 56",
 *     client_email: "jean@email.com",
 *     article: "Free Fire – 110 Jetons",
 *     montant: 800,
 *     uid: "12345678",
 *     transaction_id: "TXN_123456"
 *   })
 * })
 * .then(res => res.json())
 * .then(data => console.log('Success:', data))
 * .catch(err => console.error('Error:', err));
 */
