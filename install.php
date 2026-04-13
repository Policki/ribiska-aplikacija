<?php
declare(strict_types=1);

require_once __DIR__ . '/php/config.php';

$dsn = sprintf('mysql:host=%s;charset=%s', RD_DB_HOST, RD_DB_CHARSET);
$pdo = new PDO($dsn, RD_DB_USER, RD_DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$sql = file_get_contents(__DIR__ . '/database.sql');
if ($sql === false) {
    throw new RuntimeException('Datoteke database.sql ni mogoče prebrati.');
}

$pdo->exec($sql);

require_once __DIR__ . '/php/auth.php';
require_once __DIR__ . '/php/sync.php';

rd_ensure_admin_user();
$syncCount = rd_sync_all_storage();

header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html>
<html lang="sl">
  <head>
    <meta charset="utf-8">
    <title>RD Mozirje - namestitev</title>
    <link rel="stylesheet" href="styles.css">
  </head>
  <body class="page login-page">
    <main class="login-main">
      <div class="login-card">
        <h1>Namestitev uspešna</h1>
        <p>Baza <strong>rd_mozirje</strong> je pripravljena.</p>
        <p>Admin uporabnik: <strong><?= htmlspecialchars(RD_DEFAULT_ADMIN_USERNAME, ENT_QUOTES, 'UTF-8') ?></strong></p>
        <p>Začasno geslo: <strong><?= htmlspecialchars(RD_DEFAULT_ADMIN_PASSWORD, ENT_QUOTES, 'UTF-8') ?></strong></p>
        <p>Po prvi prijavi geslo zamenjaj.</p>
        <p>Preslikanih storage ključev v SQL tabele: <strong><?= (int) $syncCount ?></strong></p>
        <a class="btn btn-primary" href="index.php">Na prijavo</a>
      </div>
    </main>
  </body>
</html>
