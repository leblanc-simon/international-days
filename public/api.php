<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

/**
 * Envoie la réponse avec les en-têtes de cache et sort.
 *
 * Le contenu ne bouge qu'au passage de minuit : la vue par défaut change de
 * jour, et les dates résolues de la vue mensuelle valent pour l'année en
 * cours. On laisse donc le navigateur garder la réponse jusque-là, et l'ETag
 * évite de retransmettre le corps quand il n'a pas changé (une mise à jour
 * des données en cours de journée est ainsi récupérée dès le lendemain).
 */
function respond($payload): void
{
    $body = json_encode($payload);
    $etag = '"'.md5($body).'"';

    header('Cache-Control: public, max-age='.max(1, strtotime('tomorrow') - time()));
    header('ETag: '.$etag);

    $sent = trim(str_replace('W/', '', $_SERVER['HTTP_IF_NONE_MATCH'] ?? ''));
    if ($sent === $etag) {
        http_response_code(304);
        exit;
    }

    echo $body;
    exit;
}

$cache_filename = __DIR__.'/../cache/'.date('Y').'.php';

if (false === file_exists($cache_filename)) {
    if (false === require __DIR__.'/../bin/build-cache.php') {
        // Surtout pas de mise en cache d'une erreur.
        header('Cache-Control: no-store');
        header('HTTP/1.0 500 Internal Server Error');
        echo json_encode([
            'error' => 'Fail to get datas',
        ]);
        exit;
    }
}

require_once $cache_filename;

if (true === isset($_GET['month']) && true === is_numeric($_GET['month'])) {
    respond($international_days_by_month[$_GET['month']] ?? []);
}

// Default : get for today
$date = date('Y-m-d');

respond([
    'date' => $date,
    'datas' => $international_days[$date] ?? [],
]);
