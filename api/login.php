<?php
declare(strict_types=1);

require_once __DIR__ . '/../php/auth.php';

rd_ensure_admin_user();

$data = rd_request_json();
$username = trim((string) ($data['username'] ?? ''));
$password = (string) ($data['password'] ?? '');

if ($username === '' || $password === '') {
    rd_json_response(['ok' => false, 'error' => 'Vnesite uporabniško ime in geslo.'], 422);
}

$row = rd_find_user($username);
if (!$row || !password_verify($password, $row['password_hash'])) {
    rd_json_response(['ok' => false, 'error' => 'Napačno uporabniško ime ali geslo.'], 401);
}

$_SESSION['rd_username'] = $row['username'];

$pdo = rd_pdo();
$stmt = $pdo->prepare('INSERT INTO rd_audit_log (username, action, details) VALUES (?, ?, ?)');
$stmt->execute([$row['username'], 'Prijava', 'Prijava v sistem.']);

rd_json_response([
    'ok' => true,
    'user' => rd_public_user($row),
]);

