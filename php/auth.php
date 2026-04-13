<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_name('RD_MOZIRJE_SEJA');
    session_start();
}

function rd_default_admin_permissions(): array
{
    return [
        'canEditMembers' => true,
        'canArchiveMembers' => true,
        'canManageUsers' => true,
        'canSeeHistory' => true,
        'canSendEmail' => true,
        'canSendSms' => true,
        'canMessageAllStatuses' => true,
        'canUseSensitiveMessageFilters' => true,
        'canSeeDashboardActiveMembers' => true,
        'canSeeDashboardPhoneQueue' => true,
        'canSeeDashboardCardQueue' => true,
        'canSeeDashboardApplications' => true,
        'canExportMembers' => true,
        'canPrintDocuments' => true,
        'canManageCalendar' => true,
        'canManageFees' => true,
        'canManageWorkHours' => true,
        'canConfirmApplications' => true,
        'canManageYearlyRecaps' => true,
        'canViewObservationAdmin' => true,
    ];
}

function rd_decode_json_column(?string $value, array $fallback): array
{
    if (!$value) {
        return $fallback;
    }

    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function rd_public_user(array $row): array
{
    return [
        'username' => $row['username'],
        'mustChangePassword' => (bool) $row['must_change_password'],
        'modules' => rd_decode_json_column($row['modules_json'] ?? null, ['*']),
        'permissions' => rd_decode_json_column($row['permissions_json'] ?? null, []),
        'visibleStatuses' => rd_decode_json_column($row['visible_statuses_json'] ?? null, ['*']),
    ];
}

function rd_find_user(string $username): ?array
{
    $stmt = rd_pdo()->prepare('SELECT * FROM rd_users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function rd_current_user(): ?array
{
    $username = $_SESSION['rd_username'] ?? '';
    if (!is_string($username) || $username === '') {
        return null;
    }

    $row = rd_find_user($username);
    return $row ? rd_public_user($row) : null;
}

function rd_require_login(): array
{
    $user = rd_current_user();
    if (!$user) {
        rd_json_response(['ok' => false, 'error' => 'Potrebna je prijava.'], 401);
    }

    return $user;
}

function rd_ensure_admin_user(): void
{
    $pdo = rd_pdo();
    $stmt = $pdo->prepare('SELECT id FROM rd_users WHERE username = ? LIMIT 1');
    $stmt->execute([RD_DEFAULT_ADMIN_USERNAME]);
    if ($stmt->fetch()) {
        return;
    }

    $insert = $pdo->prepare(
        'INSERT INTO rd_users (username, password_hash, must_change_password, modules_json, permissions_json, visible_statuses_json)
         VALUES (?, ?, 1, ?, ?, ?)'
    );

    $insert->execute([
        RD_DEFAULT_ADMIN_USERNAME,
        password_hash(RD_DEFAULT_ADMIN_PASSWORD, PASSWORD_DEFAULT),
        json_encode(['*'], JSON_UNESCAPED_UNICODE),
        json_encode(rd_default_admin_permissions(), JSON_UNESCAPED_UNICODE),
        json_encode(['*'], JSON_UNESCAPED_UNICODE),
    ]);
}

