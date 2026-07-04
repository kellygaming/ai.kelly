// ═══════════════════════════════════════════════════════════════
// KELLY GAMING - API NOTIFICATIONS
// GET /api/notifications → Récupérer les notifications actives
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cygqjsrztuphjmaftmgg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_KEY non configurée' });
    }

    try {
        const response = await fetch(
            SUPABASE_URL + '/rest/v1/notifications?active=eq.true&select=*&order=created_at.desc&limit=20',
            {
                method: 'GET',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Supabase error: ' + await response.text());
        }

        const notifications = await response.json();

        return res.status(200).json({
            success: true,
            notifications: notifications || []
        });

    } catch (error) {
        console.error('Erreur Notifications API:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
}
