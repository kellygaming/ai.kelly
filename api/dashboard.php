<?php
/**
 * ════════════════════════════════════════════════════════════
 * KELLYYT — API Dashboard (Get User Transactions)
 * Endpoint: GET /api/dashboard.php
 * ════════════════════════════════════════════════════════════
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*'));

require_once __DIR__ . '/config.php';

// ── Vérifier que l'utilisateur est connecté ────────────────
require_login();

$user = get_current_user();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Session expirée']);
    exit;
}

// ── Récupérer les transactions de l'utilisateur ────────────
try {
    $stmt = $pdo->prepare("
        SELECT 
            id,
            uid,
            article,
            montant,
            devise,
            statut,
            created_at
        FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
    ");
    $stmt->execute([$user['id']]);
    $transactions = $stmt->fetchAll();

    // Formater les dates et montants
    $formatted = array_map(function($tx) {
        return [
            'id' => $tx['id'],
            'uid' => $tx['uid'],
            'article' => $tx['article'],
            'montant' => number_format($tx['montant'], 0, '.', ' ') . ' ' . $tx['devise'],
            'statut' => $tx['statut'],
            'date' => (new DateTime($tx['created_at']))->format('d/m/Y à H:i'),
            'timestamp' => strtotime($tx['created_at'])
        ];
    }, $transactions);

    // ── Statistiques ───────────────────────────────────────
    $total_spent = 0;
    $count_success = 0;
    foreach ($transactions as $tx) {
        if ($tx['statut'] === 'PAID') {
            $total_spent += $tx['montant'];
            $count_success++;
        }
    }

    // ── Réponse ────────────────────────────────────────────
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email']
        ],
        'stats' => [
            'total_transactions' => count($transactions),
            'transactions_paid' => $count_success,
            'total_spent' => number_format($total_spent, 0) . ' FCFA'
        ],
        'transactions' => $formatted
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Dashboard error: " . $e->getMessage());
    echo json_encode(['error' => 'Erreur serveur']);
}

?>
