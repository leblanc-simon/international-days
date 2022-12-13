<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$cache_filename = __DIR__.'/../cache/'.date('Y').'.php';

if (false === file_exists($cache_filename)) {
    if (false === require __DIR__.'/../bin/build-cache.php') {
        header('HTTP/1.0 500 Internal Server Error');
        echo json_encode([
            'error' => 'Fail to get datas',
        ]);
        exit;
    }
}

require_once $cache_filename;

if (true === isset($_GET['month']) && true === is_numeric($_GET['month'])) {
    echo json_encode($international_days_by_month[$_GET['month']] ?? []);
    exit;
}

// Default : get for today
$date = date('Y-m-d');

echo json_encode([
    'date' => $date,
    'datas' => $international_days[$date] ?? [],
]);
