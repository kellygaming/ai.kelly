// API Route Vercel - Payment Callback Handler
// URL: https://kellygame.shop/api/payment-callback

export default async function handler(req, res) {
    // Seulement accepter les requêtes POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Recevoir les données de MoneyFusion
        const {
            status,
            amount,
            reference,
            orderId,
            customerId
        } = req.body;

        console.log('💳 Payment Callback reçu:', {
            status,
            amount,
            reference,
            orderId,
            customerId,
            timestamp: new Date().toISOString()
        });

        // Vérifier que le paiement est confirmé
        if (status === 'confirmed' || status === 'success' || status === 'completed') {
            // REDIRECTION FORCÉE VERS SUCCESS.HTML
            return res.redirect(307, 'https://kellygame.shop/success.html');
        }

        // Si paiement échoué, rediriger aussi vers success (même page pour les 2)
        return res.redirect(307, 'https://kellygame.shop/success.html');

    } catch (error) {
        console.error('❌ Erreur Payment Callback:', error);
        // En cas d'erreur, rediriger quand même vers success
        return res.redirect(307, 'https://kellygame.shop/success.html');
    }
}
