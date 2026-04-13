<?php
declare(strict_types=1);

require_once __DIR__ . '/../php/auth.php';
require_once __DIR__ . '/../php/sync.php';

$user = rd_require_login();
$pdo = rd_pdo();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $stmt = $pdo->query('SELECT storage_key, storage_value FROM rd_storage');
    $items = [];
    foreach ($stmt->fetchAll() as $row) {
        $items[$row['storage_key']] = $row['storage_value'];
    }

    rd_json_response(['ok' => true, 'items' => $items]);
}

if ($method !== 'POST') {
    rd_json_response(['ok' => false, 'error' => 'Metoda ni dovoljena.'], 405);
}

$data = rd_request_json();
$items = $data['items'] ?? null;

if (!is_array($items)) {
    $key = (string) ($data['key'] ?? '');
    if ($key === '') {
        rd_json_response(['ok' => false, 'error' => 'Manjka ključ za shranjevanje.'], 422);
    }
    $items = [$key => (string) ($data['value'] ?? '')];
}

$stmt = $pdo->prepare(
    'INSERT INTO rd_storage (storage_key, storage_value, updated_by)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE storage_value = VALUES(storage_value), updated_by = VALUES(updated_by)'
);

$saved = 0;
foreach ($items as $key => $value) {
    $key = trim((string) $key);
    if ($key === '' || substr($key, 0, 3) !== 'rd_') {
        continue;
    }

    $stringValue = (string) $value;
    $stmt->execute([$key, $stringValue, $user['username']]);
    rd_sync_storage_key($key, $stringValue);
    $saved++;
}

rd_json_response(['ok' => true, 'saved' => $saved]);
