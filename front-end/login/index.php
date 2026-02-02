<?php
include '../config.php';
session_start();
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login - <?=htmlspecialchars($WEBSITE_NAME ?? 'Eventplannr', ENT_QUOTES, 'UTF-8')?></title>
    <link rel="stylesheet" href="../css/style.css">
    <style>
        .card { max-width:400px; margin:48px auto; border:1px solid #ddd; padding:16px; border-radius:6px; }
        .card h2 { margin-top:0; }
        .actions { margin-top:12px; }
    </style>
</head>
<body>
    <header class="navbar">
        <div class="brand"><?=htmlspecialchars($WEBSITE_NAME ?? 'Eventplannr', ENT_QUOTES, 'UTF-8')?></div>
        <nav class="menu">
            <a href="/">Home</a>
            <a href="/index">Login</a>
        </nav>
    </header>


    <div class="card">
        <h2>Login</h2>
        <p>This is a placeholder login page.</p>
        <div class="actions">
            <a href="/">Back to Home</a>
        </div>
    </div>
</body>
</html>
