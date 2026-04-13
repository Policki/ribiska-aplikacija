<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function rd_sync_json_decode(string $value): mixed
{
    $decoded = json_decode($value, true);
    return $decoded;
}

function rd_payload(array $data): string
{
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
}

function rd_id(array $row, string $preferred = 'id'): int
{
    $value = $row[$preferred] ?? $row['memberId'] ?? $row['applicationId'] ?? $row['observationId'] ?? null;
    if (is_numeric($value)) {
        return (int) $value;
    }
    return (int) sprintf('%u', crc32(rd_payload($row)));
}

function rd_date_or_null(mixed $value): ?string
{
    $value = trim((string) ($value ?? ''));
    if ($value === '') return null;
    $timestamp = strtotime($value);
    return $timestamp ? date('Y-m-d', $timestamp) : null;
}

function rd_datetime_or_null(mixed $value): ?string
{
    $value = trim((string) ($value ?? ''));
    if ($value === '') return null;
    $timestamp = strtotime($value);
    return $timestamp ? date('Y-m-d H:i:s', $timestamp) : null;
}

function rd_number_or_null(mixed $value): ?float
{
    if ($value === null || $value === '') return null;
    if (is_numeric($value)) return (float) $value;
    return null;
}

function rd_sync_storage_key(string $key, string $value): void
{
    $data = rd_sync_json_decode($value);
    if ($data === null && strtolower(trim($value)) !== 'null') {
        return;
    }

    if ($key === 'rd_members' && is_array($data)) {
        rd_sync_members($data);
        return;
    }

    if ($key === 'rd_events' && is_array($data)) {
        rd_sync_events($data);
        return;
    }

    if ($key === 'rd_fee_status_v1' && is_array($data)) {
        rd_sync_fee_statuses($data);
        return;
    }

    if ($key === 'rd_work_hours' && is_array($data)) {
        rd_sync_work_hours($data);
        return;
    }

    if ($key === 'rd_licenses_active_v1' && is_array($data)) {
        rd_sync_licenses($data, false);
        return;
    }

    if ($key === 'rd_licenses_archive_v1' && is_array($data)) {
        rd_sync_licenses($data, true);
        return;
    }

    if ($key === 'rd_awards_history_v1' && is_array($data)) {
        rd_sync_awards($data);
        return;
    }

    if ($key === 'rd_officials' && is_array($data)) {
        rd_sync_officials($data);
        return;
    }

    if ($key === 'rd_membership_applications' && is_array($data)) {
        rd_sync_membership_applications($data);
        return;
    }

    if ($key === 'rd_animal_observations' && is_array($data)) {
        rd_sync_animal_observations($data);
        return;
    }

    if ($key === 'rd_yearly_recaps' && is_array($data)) {
        rd_sync_yearly_recaps($data);
        return;
    }

    if ($key === 'rd_reminders' && is_array($data)) {
        rd_sync_reminders($data);
        return;
    }

    if ($key === 'rd_communication_groups' && is_array($data)) {
        rd_sync_communication_groups($data);
        return;
    }

    if ($key === 'rd_communication_log' && is_array($data)) {
        rd_sync_communication_log($data);
    }
}

function rd_sync_all_storage(): int
{
    $stmt = rd_pdo()->query('SELECT storage_key, storage_value FROM rd_storage');
    $count = 0;
    foreach ($stmt->fetchAll() as $row) {
        rd_sync_storage_key((string) $row['storage_key'], (string) $row['storage_value']);
        $count++;
    }
    return $count;
}

function rd_sync_members(array $members): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_members');
    $stmt = $pdo->prepare('INSERT INTO rd_members
        (member_id, zap_st, status, spc, clanska, priimek, ime, email, telefon, naslov, posta, kraj, tip_karte, datum_rojstva, datum_vpisa, arhiviran, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($members as $m) {
        if (!is_array($m)) continue;
        $stmt->execute([
            rd_id($m), $m['zapSt'] ?? null, $m['status'] ?? null, $m['spc'] ?? null, $m['clanska'] ?? null,
            $m['priimek'] ?? null, $m['ime'] ?? null, $m['email'] ?? null, $m['telefon'] ?? null,
            $m['naslov'] ?? null, $m['posta'] ?? null, $m['kraj'] ?? null, $m['tipKarte'] ?? ($m['tipLetneKarte'] ?? null),
            rd_date_or_null($m['datumRojstva'] ?? null), rd_date_or_null($m['datumVpisa'] ?? null), !empty($m['arhiviran']) ? 1 : 0,
            rd_payload($m),
        ]);
    }
}

function rd_sync_events(array $events): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_events');
    $stmt = $pdo->prepare('INSERT INTO rd_events (event_id, naslov, datum, tip, revir, payload_json) VALUES (?, ?, ?, ?, ?, ?)');
    foreach ($events as $e) {
        if (!is_array($e)) continue;
        $stmt->execute([rd_id($e), $e['naslov'] ?? ($e['title'] ?? null), rd_date_or_null($e['datum'] ?? ($e['date'] ?? null)), $e['tip'] ?? ($e['type'] ?? null), $e['revir'] ?? null, rd_payload($e)]);
    }
}

function rd_sync_fee_statuses(array $years): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_member_fees');
    $stmt = $pdo->prepare('INSERT INTO rd_member_fees (fee_year, member_id, state, amount, updated_source_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)');
    foreach ($years as $year => $members) {
        if (!is_array($members)) continue;
        foreach ($members as $memberId => $entry) {
            if (!is_array($entry)) $entry = ['state' => (string) $entry];
            $stmt->execute([(int) $year, (int) $memberId, $entry['state'] ?? 'UNPAID', rd_number_or_null($entry['amount'] ?? null), rd_datetime_or_null($entry['updatedAt'] ?? null), rd_payload($entry)]);
        }
    }
}

function rd_sync_work_hours(array $years): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_work_hours');
    $stmt = $pdo->prepare('INSERT INTO rd_work_hours (work_year, member_id, hours_done, payload_json) VALUES (?, ?, ?, ?)');
    foreach ($years as $year => $members) {
        if (!is_array($members)) continue;
        foreach ($members as $memberId => $entry) {
            $payload = is_array($entry) ? $entry : ['hours' => $entry];
            $hours = $payload['hoursDone'] ?? $payload['opravljeneUre'] ?? $payload['hours'] ?? 0;
            $stmt->execute([(int) $year, (int) $memberId, (float) $hours, rd_payload($payload)]);
        }
    }
}

function rd_sync_licenses(array $years, bool $archived): void
{
    $pdo = rd_pdo();
    $delete = $pdo->prepare('DELETE FROM rd_licenses WHERE archived = ?');
    $delete->execute([$archived ? 1 : 0]);
    $stmt = $pdo->prepare('INSERT INTO rd_licenses
        (license_year, license_id, member_id, st_karte, vrsta_karte, ime, priimek, revir0, revir1, revir2, archived, payload_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($years as $year => $list) {
        if (!is_array($list)) continue;
        foreach ($list as $i => $lic) {
            if (!is_array($lic)) continue;
            $id = rd_id($lic) ?: ((int) $year * 100000 + (int) $i + 1);
            $stmt->execute([(int) $year, $id, isset($lic['memberId']) && is_numeric($lic['memberId']) ? (int) $lic['memberId'] : null, (string) ($lic['stKarte'] ?? ''), $lic['vrstaKarte'] ?? null, $lic['ime'] ?? null, $lic['priimek'] ?? null, $lic['revir0'] ?? null, $lic['revir1'] ?? null, $lic['revir2'] ?? null, $archived ? 1 : 0, rd_payload($lic)]);
        }
    }
}

function rd_sync_awards(array $awards): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_awards');
    $stmt = $pdo->prepare('INSERT INTO rd_awards (award_id, member_id, award_key, award_date, payload_json) VALUES (?, ?, ?, ?, ?)');
    foreach ($awards as $a) {
        if (!is_array($a)) continue;
        $stmt->execute([rd_id($a), (int) ($a['memberId'] ?? 0), $a['awardKey'] ?? '', rd_date_or_null($a['date'] ?? null), rd_payload($a)]);
    }
}

function rd_sync_officials(array $officials): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_officials');
    $stmt = $pdo->prepare('INSERT INTO rd_officials (official_id, member_id, body, role, mandate_start, mandate_end, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($officials as $o) {
        if (!is_array($o)) continue;
        $stmt->execute([rd_id($o), isset($o['memberId']) ? (int) $o['memberId'] : null, $o['body'] ?? null, $o['role'] ?? null, isset($o['mandateStart']) ? (int) $o['mandateStart'] : null, isset($o['mandateEnd']) ? (int) $o['mandateEnd'] : null, rd_payload($o)]);
    }
}

function rd_sync_membership_applications(array $apps): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_membership_applications');
    $stmt = $pdo->prepare('INSERT INTO rd_membership_applications (application_id, priimek, ime, email, telefon, status, submitted_at, admin_confirmed_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($apps as $a) {
        if (!is_array($a)) continue;
        $stmt->execute([rd_id($a), $a['priimek'] ?? null, $a['ime'] ?? null, $a['email'] ?? null, $a['telefon'] ?? null, $a['status'] ?? null, rd_datetime_or_null($a['submittedAt'] ?? null), rd_datetime_or_null($a['adminConfirmedAt'] ?? null), rd_payload($a)]);
    }
}

function rd_sync_animal_observations(array $items): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_animal_observations');
    $stmt = $pdo->prepare('INSERT INTO rd_animal_observations (observation_id, observer_name, title, location_name, lat, lng, observed_at, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($items as $o) {
        if (!is_array($o)) continue;
        $stmt->execute([rd_id($o), $o['observerName'] ?? ($o['imePriimek'] ?? null), $o['title'] ?? ($o['kaj'] ?? null), $o['locationName'] ?? ($o['kraj'] ?? null), rd_number_or_null($o['lat'] ?? null), rd_number_or_null($o['lng'] ?? null), rd_datetime_or_null($o['observedAt'] ?? ($o['createdAt'] ?? null)), rd_payload($o)]);
    }
}

function rd_sync_yearly_recaps(array $items): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_yearly_recaps');
    $stmt = $pdo->prepare('INSERT INTO rd_yearly_recaps (recap_id, recap_year, permit_number, permit_type, submitted_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)');
    foreach ($items as $r) {
        if (!is_array($r)) continue;
        $stmt->execute([rd_id($r), (int) ($r['year'] ?? date('Y')), (string) ($r['permitNumber'] ?? ''), (string) ($r['permitType'] ?? 'clanska'), rd_datetime_or_null($r['submittedAt'] ?? ($r['updatedAt'] ?? null)), rd_payload($r)]);
    }
}

function rd_sync_reminders(array $items): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_reminders');
    $stmt = $pdo->prepare('INSERT INTO rd_reminders (reminder_id, title, reminder_time, done, payload_json) VALUES (?, ?, ?, ?, ?)');
    foreach ($items as $r) {
        if (!is_array($r)) continue;
        $stmt->execute([rd_id($r), $r['title'] ?? null, rd_datetime_or_null($r['datetime'] ?? null), !empty($r['done']) ? 1 : 0, rd_payload($r)]);
    }
}

function rd_sync_communication_groups(array $items): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_communication_groups');
    $stmt = $pdo->prepare('INSERT INTO rd_communication_groups (group_id, name, channel, member_count, payload_json) VALUES (?, ?, ?, ?, ?)');
    foreach ($items as $g) {
        if (!is_array($g)) continue;
        $stmt->execute([rd_id($g), $g['name'] ?? '', $g['channel'] ?? null, is_array($g['memberIds'] ?? null) ? count($g['memberIds']) : 0, rd_payload($g)]);
    }
}

function rd_sync_communication_log(array $items): void
{
    $pdo = rd_pdo();
    $pdo->exec('DELETE FROM rd_communication_log');
    $stmt = $pdo->prepare('INSERT INTO rd_communication_log (message_id, channel, subject, recipient_count, created_by, created_at_source, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($items as $m) {
        if (!is_array($m)) continue;
        $stmt->execute([rd_id($m), $m['channel'] ?? null, $m['subject'] ?? null, (int) ($m['recipientCount'] ?? 0), $m['createdBy'] ?? null, rd_datetime_or_null($m['createdAt'] ?? null), rd_payload($m)]);
    }
}
