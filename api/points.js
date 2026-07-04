// ═══════════════════════════════════════════════════════════════
// KELLY GAMING - API POINTS DE FIDÉLITÉ
// Endpoints:
//   GET  ?action=get&email=xxx          → Récupérer les points
//   POST ?action=earn                   → Gagner des points (après achat)
//   POST ?action=spend                  → Dépenser des points
//   GET  ?action=history&email=xxx      → Historique des points
//   POST ?action=register               → Créer un utilisateur (connexion Google)
//   POST ?action=link_player_id         → Lier un Player ID au compte Google
//   GET  ?action=find_by_player&pid=xxx → Trouver un email par Player ID
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cygqjsrztuphjmaftmgg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function supabaseRequest(path, method, body) {
    const options = {
        method: method || 'GET',
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': method === 'POST' ? 'return=representation' : (method === 'PATCH' ? 'return=representation' : 'return=minimal')
        }
    };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(SUPABASE_URL + '/rest/v1/' + path, options);
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error('Supabase error: ' + error);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!SUPABASE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_KEY non configurée' });
    }

    const action = req.query.action;

    try {
        // ═══ REGISTER (créer un utilisateur à la connexion Google) ═══
        if (action === 'register' && req.method === 'POST') {
            const { email, name, picture } = req.body;
            if (!email) return res.status(400).json({ error: 'Email requis' });

            const existing = await supabaseRequest(
                'users?email=eq.' + encodeURIComponent(email) + '&select=*', 'GET'
            );

            if (existing && existing.length > 0) {
                await supabaseRequest(
                    'users?email=eq.' + encodeURIComponent(email),
                    'PATCH',
                    { name, picture, updated_at: new Date().toISOString() }
                );
                return res.status(200).json({
                    success: true,
                    user: existing[0],
                    isNew: false
                });
            }

            const newUser = await supabaseRequest('users', 'POST', {
                email, name, picture, points: 0, total_spent: 0, total_purchases: 0
            });

            return res.status(201).json({
                success: true,
                user: newUser[0],
                isNew: true
            });
        }

        // ═══ LINK PLAYER ID (lier un Player ID au compte Google) ═══
        if (action === 'link_player_id' && req.method === 'POST') {
            const { email, player_id } = req.body;
            if (!email || !player_id) {
                return res.status(400).json({ error: 'Email et Player ID requis' });
            }

            // Vérifier que l'utilisateur existe
            const users = await supabaseRequest(
                'users?email=eq.' + encodeURIComponent(email) + '&select=*', 'GET'
            );

            if (!users || users.length === 0) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }

            // Mettre à jour le player_id
            await supabaseRequest(
                'users?email=eq.' + encodeURIComponent(email),
                'PATCH',
                { player_id: player_id, updated_at: new Date().toISOString() }
            );

            return res.status(200).json({
                success: true,
                message: 'Player ID lié avec succès!',
                player_id: player_id
            });
        }

        // ═══ FIND BY PLAYER ID (trouver l'email par Player ID) ═══
        if (action === 'find_by_player' && req.method === 'GET') {
            const pid = req.query.pid;
            if (!pid) return res.status(400).json({ error: 'Player ID requis' });

            const users = await supabaseRequest(
                'users?player_id=eq.' + encodeURIComponent(pid) + '&select=*', 'GET'
            );

            if (users && users.length > 0) {
                return res.status(200).json({
                    success: true,
                    found: true,
                    email: users[0].email,
                    user: users[0]
                });
            }

            return res.status(200).json({
                success: true,
                found: false,
                message: 'Aucun compte lié à ce Player ID'
            });
        }

        // ═══ GET POINTS ═══
        if (action === 'get' && req.method === 'GET') {
            const email = req.query.email;
            if (!email) return res.status(400).json({ error: 'Email requis' });

            const users = await supabaseRequest(
                'users?email=eq.' + encodeURIComponent(email) + '&select=*', 'GET'
            );

            if (!users || users.length === 0) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }

            return res.status(200).json({
                success: true,
                points: users[0].points,
                total_spent: users[0].total_spent,
                total_purchases: users[0].total_purchases,
                player_id: users[0].player_id
            });
        }

        // ═══ EARN POINTS (après un achat) ═══
        if (action === 'earn' && req.method === 'POST') {
            const { email, player_id, amount, game, packageName, purchaseAmount } = req.body;

            // Chercher l'utilisateur par player_id OU par email
            let userEmail = email;
            
            if (player_id) {
                const lookup = await supabaseRequest(
                    'users?player_id=eq.' + encodeURIComponent(player_id) + '&select=*', 'GET'
                );
                if (lookup && lookup.length > 0) {
                    userEmail = lookup[0].email;
                    console.log('[POINTS] Player ID ' + player_id + ' → Email: ' + userEmail);
                } else {
                    console.log('[POINTS] Player ID ' + player_id + ' non lié, points ignorés');
                    return res.status(200).json({
                        success: false,
                        message: 'Player ID non lié à un compte. Points non ajoutés.'
                    });
                }
            }

            if (!userEmail || !amount) {
                return res.status(400).json({ error: 'Email et montant requis' });
            }

            const users = await supabaseRequest(
                'users?email=eq.' + encodeURIComponent(userEmail) + '&select=*', 'GET'
            );

            if (!users || users.length === 0) {
                return res.status(404).json({ error: 'Utilisateur non trouvé' });
            }

            const user = users[0];
            const newPoints = user.points + amount;
            const newTotalSpent = user.total_spent + (purchaseAmount || 0);
            const newTotalPurchases = user.total_purchases + 1;

            await supabaseRequest(
                'users?email=eq.' + encodeURIComponent(userEmail),
                'PATCH',
                {
                    points: newPoints,
                    total_spent: newTotalSpent,
                    total_purchases: newTotalPurchases,
                    updated_at: new Date().toISOString()
                }
            );

            await supabaseRequest('points_history', 'POST', {
                user_email: userEmail,
                amount: amount,
                type: 'earn',
                description: 'Achat ' + (game || '') + ' - ' + (packageName || ''),
                game: game || null,
                package: packageName || null,
                purchase_amount: purchaseAmount || 0
            });

            return res.status(200).json({
                success: true,
                points_earned: amount,
                total_points: newPoints,
                message: '+' + amount + ' points gagnés!'
            });
        }

        // ═══ SPEND POINTS ═══
        if (action === 'spend' && req.method === 'POST') {
            const { email, amount, description } = req.body;
            if (!email || !amount) return res.status(400).json({ error: 'Email et montant requis' });

            const users = await supabaseRequest(
                'users?email=eq.' + encodeURIComponent(email) + '&select=*', 'GET'
            );

            if (!users || users.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });

            const user = users[0];
            if (user.points < amount) {
                return res.status(400).json({
                    error: 'Points insuffisants',
                    points_available: user.points,
                    points_needed: amount
                });
            }

            const newPoints = user.points - amount;

            await supabaseRequest(
                'users?email=eq.' + encodeURIComponent(email),
                'PATCH',
                { points: newPoints, updated_at: new Date().toISOString() }
            );

            await supabaseRequest('points_history', 'POST', {
                user_email: email,
                amount: -amount,
                type: 'spend',
                description: description || 'Utilisation de points'
            });

            return res.status(200).json({
                success: true,
                points_spent: amount,
                total_points: newPoints,
                message: amount + ' points utilisés!'
            });
        }

        // ═══ HISTORY ═══
        if (action === 'history' && req.method === 'GET') {
            const email = req.query.email;
            if (!email) return res.status(400).json({ error: 'Email requis' });

            const history = await supabaseRequest(
                'points_history?user_email=eq.' + encodeURIComponent(email) +
                '&select=*&order=created_at.desc&limit=20', 'GET'
            );

            return res.status(200).json({
                success: true,
                history: history || []
            });
        }

        return res.status(400).json({ error: 'Action invalide' });

    } catch (error) {
        console.error('Erreur Points API:', error);
        return res.status(500).json({ error: 'Erreur serveur: ' + error.message });
    }
}
