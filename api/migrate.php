<?php
declare(strict_types=1);

require_once __DIR__ . '/../php/auth.php';
require_once __DIR__ . '/../php/sync.php';

$user = rd_require_login();
$isAdmin = ($user['username'] ?? '') === RD_DEFAULT_ADMIN_USERNAME || !empty($user['permissions']['canManageUsers']);
if (!$isAdmin) {
    rd_json_response(['ok' => false, 'error' => 'Samo administrator lahko izvede migracijo.'], 403);
}

$count = rd_sync_all_storage();
$stmt = rd_pdo()->prepare('INSERT INTO rd_audit_log (username, action, details) VALUES (?, ?, ?)');
$stmt->execute([$user['username'], 'Migracija SQL tabel', "Preslikanih storage ključev: {$count}."]);

rd_json_response(['ok' => true, 'syncedStorageKeys' => $count]);
