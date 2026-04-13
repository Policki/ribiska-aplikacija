<?php
declare(strict_types=1);

require_once __DIR__ . '/../php/auth.php';

$user = rd_current_user();
rd_json_response([
    'ok' => true,
    'authenticated' => $user !== null,
    'user' => $user,
]);

