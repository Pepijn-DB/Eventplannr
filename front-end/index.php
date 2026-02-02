<?php
include 'config.php';
session_start();

$shouldRedirect = false;
$envRedirect = (string) env('REDIRECT_TO_LOGIN', '0');
if ($envRedirect === '1') {
    $shouldRedirect = true;
}
if (isset($_GET['force_redirect']) && (string)$_GET['force_redirect'] === '1') {
    $shouldRedirect = true;
}
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title><?=htmlspecialchars($WEBSITE_NAME ?? 'Eventplannr', ENT_QUOTES, 'UTF-8')?></title>
    <link rel="stylesheet" href="css/style.css">
    <style>
        .redirect-banner { background:#f39c12; color:#111; padding:12px; border-radius:6px; display:inline-block; margin-top:12px; }
    </style>
</head>
<body>
    <header class="navbar">
        <div class="brand"><?=htmlspecialchars($WEBSITE_NAME ?? 'Eventplannr', ENT_QUOTES, 'UTF-8')?></div>
        <nav class="menu">
            <a href="/">Home</a>
            <a href="/login">Login</a>
        </nav>
    </header>

    <main class="container">
        <h1>Welcome to <?=htmlspecialchars($WEBSITE_NAME ?? 'Eventplannr', ENT_QUOTES, 'UTF-8')?></h1>
        <p>This is the home page. Use the menu above to navigate.</p>

        <?php if ($shouldRedirect): ?>
            <div class="redirect-banner">
                You will be redirected to the login page in <span id="countdown">10</span> seconds. <a href="/login/">Click here to go now</a>.
            </div>

            <script>
                (function(){
                    var seconds = 10;
                    var el = document.getElementById('countdown');
                    if (!el) return;
                    el.textContent = seconds;
                    var interval = setInterval(function(){
                        seconds -= 1;
                        if (seconds <= 0) {
                            clearInterval(interval);
                            window.location.href = 'login';
                            return;
                        }
                        el.textContent = seconds;
                    }, 1000);
                })();
            </script>
            <noscript>
                <meta http-equiv="refresh" content="10;url=login">
            </noscript>
        <?php endif; ?>

    </main>

</body>
</html>