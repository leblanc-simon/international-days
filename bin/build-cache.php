<?php

define('CACHE_DIR', __DIR__.'/../cache');

if (false === is_dir(CACHE_DIR)) {
    if (false === @mkdir(CACHE_DIR, 0755) || false === is_dir(CACHE_DIR)) {
        return false;
    }
}

function buildDate($international_day)
{
    if (
        true === property_exists($international_day, 'day')
        &&
        true === property_exists($international_day, 'month')
    ) {
        $date = new \DateTime();
        $date->setDate(
            date('Y'),
            $international_day->month,
            $international_day->day
        );

        return $date->format('Y-m-d');
    }

    if (true === property_exists($international_day, 'customDay')) {
        $date = new \DateTime($international_day->customDay);

        return $date->format('Y-m-d');
    }

    return null;
}

function buildMonth($international_day)
{
    $date = buildDate($international_day);

    return (int) substr($date, 5, 2);
}

function buildItem($international_day)
{
    return [
        'date' => buildDate($international_day),
        'name' => $international_day->name,
    ];
}

$sortByDate = function ($item_a, $item_b) {
    return strcmp($item_a['date'], $item_b['date']);
};

$international_days = json_decode(require __DIR__.'/../datas/international-days.json.php');
if (false === $international_days) {
    return false;
}

$cache_days = [];
$cache_months = [];

foreach ($international_days as $international_day) {
    $date = buildDate($international_day);
    if (null === $date) {
        continue;
    }

    $month = buildMonth($international_day);

    if (false === isset($cache_days[$date])) {
        $cache_days[$date] = [];
    }

    if (false === isset($cache_months[$month])) {
        $cache_months[$month] = [];
    }

    $item = buildItem($international_day);

    $cache_days[$date][] = $item;
    $cache_months[$month][] = $item;
}

// Sort items for month
foreach ($cache_months as &$cache_month) {
    usort($cache_month, $sortByDate);
}
unset($cache_month);

$result = file_put_contents(CACHE_DIR.'/'.date('Y').'.php', sprintf(
    '<?php
    $international_days = %s;
    $international_days_by_month = %s;
    ',
    var_export($cache_days, true),
    var_export($cache_months, true)
));

return (bool) $result;
