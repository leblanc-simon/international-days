<?php

$cache_filename = __DIR__.'/../cache/'.date('Y').'.php';

if (false === file_exists($cache_filename)) {
    if (false === require __DIR__.'/../bin/build-cache.php') {
        echo 'Fail to get datas';
        exit(1);
    }
}

require_once __DIR__.'/config.php';
require_once $cache_filename;

$date = date('Y-m-d');

$international_day = $international_days[$date] ?? [];

if (0 === count($international_day)) {
    echo 'Nothing to do !';
    exit(0);
}

if (count($international_day) > 1) {
    $text = 'ce sont les journées : '."\n* ".implode("\n* ", array_column($international_day, 'name'));
} else {
    $text = 'c\'est la '.$international_day[0]['name'];
}

$payload = [
    'text' => 'Aujourd\'hui, '.$text,
];

$curl = curl_init(MATTERMOST_KOOK_URL);
curl_setopt($curl, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($curl, CURLOPT_POSTFIELDS, 'payload='.json_encode($payload));
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($curl);
if ('ok' !== $result) {
    exit(2);
}

exit(0);
