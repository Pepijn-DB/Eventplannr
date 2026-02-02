<?php
declare(strict_types=1);

$env = file_get_contents(__DIR__."/.env");
$lines = explode("\n",$env);

foreach($lines as $line){
    preg_match("/([^#]+)=(.*)/",$line,$matches);
    if(isset($matches[2])){ putenv(trim($line)); }
}

function env(string $key, $default = null) {
    if (!empty(getenv($key))) {
        return getenv($key);
    }

    return $default;
}

$DB_SERVER = (string) env('DB_SERVER', 'localhost');
$DB_USER = (string) env('DB_USER', 'user');
$DB_PASSWORD = (string) env('DB_PASSWORD', 'pass');
$DB_DATABASE = (string) env('DB_DATABASE', 'database');

$WEBSITE_NAME = (string) env('WEBSITE_NAME', 'Eventplannr');

$DISCORD_SECRET = (string) env('DISCORD_SECRET', 'secret');
$DISCORD_ID = (string) env('DISCORD_ID', 'id');

