<?php
declare(strict_types=1);

require_once __DIR__ . '/auth.php';

$file = (string) ($_GET['file'] ?? '');
$file = str_replace('\\', '/', $file);
$file = basename($file);

if ($file === '' || !preg_match('/^[\p{L}0-9._-]+\.html$/u', $file)) {
    http_response_code(404);
    echo 'Stran ni najdena.';
    exit;
}

$path = dirname(__DIR__) . DIRECTORY_SEPARATOR . $file;
if (!is_file($path)) {
    http_response_code(404);
    echo 'Stran ni najdena.';
    exit;
}

$publicPages = [
    'index.html',
    'pristopna-izjava.html',
    'opazanja-ribojedih-zivali.html',
    'letna-rekapitulacija.html',
    'koledar.html',
];

if (!in_array($file, $publicPages, true) && !rd_current_user()) {
    header('Location: ../index.php');
    exit;
}

$html = file_get_contents($path);
if ($html === false) {
    http_response_code(500);
    echo 'Strani ni mogoče prebrati.';
    exit;
}

$html = preg_replace('/href="([^"]+)\.html"/u', 'href="$1.php"', $html);

header('Content-Type: text/html; charset=utf-8');
echo $html;

