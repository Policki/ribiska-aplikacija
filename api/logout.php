<?php
declare(strict_types=1);

require_once __DIR__ . '/../php/auth.php';

$username = $_SESSION['rd_username'] ?? null;
if (is_string($username) && $username !== '') {
    $stmt = rd_pdo()->prepare('INSERT INTO rd_audit_log (username, action, details) VALUES (?, ?, ?)');
    $stmt->execute([$username, 'Odjava', 'Odjava iz sistema.']);
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();

rd_json_response(['ok' => true]);

