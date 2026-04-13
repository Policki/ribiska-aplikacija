<?php
declare(strict_types=1);

require_once __DIR__ . '/php/auth.php';

$html = file_get_contents(__DIR__ . '/index.html');
if ($html === false) {
    http_response_code(500);
    echo 'Prijavne strani ni mogoče prebrati.';
    exit;
}

header('Content-Type: text/html; charset=utf-8');
echo $html;

