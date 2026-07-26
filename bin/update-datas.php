<?php

/**
 * Met à jour automatiquement les données depuis Wikipédia.
 *
 * Remplace l'étape manuelle qui consistait à coller
 * datas/extract-from-wikipedia.js dans la console du navigateur puis à
 * recopier la sortie à la main dans les deux fichiers datas/*.json.php.
 *
 * Le script récupère le HTML rendu de l'article via l'API MediaWiki, en
 * extrait les journées internationales (même logique que le script JS) et
 * réécrit les deux fichiers JSON ainsi que (optionnellement) le cache.
 *
 * Usage :
 *   php bin/update-datas.php [--rebuild-cache] [--year=YYYY]
 *
 *   --rebuild-cache  Supprime cache/<année>.php pour forcer sa régénération
 *                    (sinon public/api.php le reconstruira au prochain appel).
 *   --year=YYYY      Année de référence inscrite en commentaire des fichiers
 *                    (défaut : année courante).
 */

const WIKI_API = 'https://fr.wikipedia.org/w/api.php';
const WIKI_PAGE = 'Journée internationale';

const FLAT_FILE = __DIR__.'/../datas/international-days.json.php';
const BY_MONTH_FILE = __DIR__.'/../datas/international-days-by-month.json.php';
const CACHE_DIR = __DIR__.'/../cache';

// Mois français -> numéro / nom anglais (pour les dates relatives).
const NUMERIC_MONTHS = [
    'Janvier' => 1, 'Février' => 2, 'Mars' => 3, 'Avril' => 4,
    'Mai' => 5, 'Juin' => 6, 'Juillet' => 7, 'Août' => 8,
    'Septembre' => 9, 'Octobre' => 10, 'Novembre' => 11, 'Décembre' => 12,
];
const ENGLISH_MONTHS = [
    'Janvier' => 'january', 'Février' => 'february', 'Mars' => 'march',
    'Avril' => 'april', 'Mai' => 'may', 'Juin' => 'june',
    'Juillet' => 'july', 'Août' => 'august', 'Septembre' => 'september',
    'Octobre' => 'october', 'Novembre' => 'november', 'Décembre' => 'december',
];
const DAYS = [
    'lundi' => 'monday', 'mardi' => 'tuesday', 'mercredi' => 'wednesday',
    'jeudi' => 'thursday', 'vendredi' => 'friday', 'samedi' => 'saturday',
    'dimanche' => 'sunday',
];
const ORDINALS = [
    'premier' => 'first', '1er' => 'first', '1e' => 'first',
    'dernier' => 'last', '2e' => 'second', '3e' => 'third',
];

/* ------------------------------------------------------------------ */

/**
 * Récupère le HTML rendu de l'article via l'API MediaWiki.
 */
function fetchWikipediaHtml(): string
{
    $url = WIKI_API.'?'.http_build_query([
        'action' => 'parse',
        'page' => WIKI_PAGE,
        'format' => 'json',
        'prop' => 'text',
        'formatversion' => '2',
        'redirects' => '1',
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 30,
        // Wikipédia exige un User-Agent descriptif.
        CURLOPT_USERAGENT => 'international-days-updater/1.0 (https://github.com/leblanc-simon/international-days)',
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
    ]);

    $body = curl_exec($ch);
    if (false === $body) {
        throw new RuntimeException('Échec de la requête HTTP : '.curl_error($ch));
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (200 !== $status) {
        throw new RuntimeException("L'API MediaWiki a répondu un statut HTTP $status.");
    }

    $json = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    if (false === isset($json['parse']['text'])) {
        throw new RuntimeException('Réponse inattendue de l\'API MediaWiki (parse.text manquant).');
    }

    return $json['parse']['text'];
}

/**
 * Texte « innerText »-like : nbsp -> espace, espaces multiples compactés, trim.
 */
function innerText(DOMNode $node): string
{
    $text = $node->textContent;
    $text = str_replace("\xc2\xa0", ' ', $text); // espace insécable U+00A0
    $text = preg_replace('/\s+/u', ' ', $text);

    return trim($text);
}

/**
 * Parse un <ul> de mois et ajoute les journées à $entries.
 *
 * Reproduit fidèlement parseInternationalDaysForMonth() du script JS,
 * y compris le traitement particulier des sous-listes (<ul> imbriqués) :
 * lorsqu'un <li> contient une sous-liste, seules les entrées filles sont
 * conservées, datées à partir du texte du <li> parent.
 */
function parseMonthList(DOMElement $ul, string $monthName, array &$entries): void
{
    foreach (childElements($ul, 'li') as $li) {
        $li = $li->cloneNode(true);
        $subUl = firstChildElement($li, 'ul');

        if (null === $subUl) {
            $text = innerText($li);
            $parts = explode(':', $text);
            $date = null;
            $name = null;
            if (count($parts) > 1) {
                $date = trim(array_shift($parts));
                $name = trim(implode(':', $parts));
            }

            $entries[] = buildEntry($monthName, $text, $date, $name);
            continue;
        }

        // Les entrées filles de la sous-liste.
        $subDays = [];
        foreach (childElements($subUl, 'li') as $subLi) {
            $subDays[] = innerText($subLi);
        }

        // La date du parent = texte du <li> sans la sous-liste, premier ':' retiré.
        $subUl->parentNode->removeChild($subUl);
        $date = trim(str_replace_first(':', '', innerText($li)));

        foreach ($subDays as $subDay) {
            $entries[] = buildEntry($monthName, $subDay, $date, $subDay);
        }
    }
}

/**
 * Construit une entrée normalisée (équivalent de cleanData()).
 *
 * Résout `day` (date fixe) ou `customDay` (date relative en anglais). Les
 * entrées dont la date ne correspond à aucun motif connu sont conservées
 * sans `day`/`customDay` et signalées (comme console.warn dans le script JS).
 */
function buildEntry(string $monthName, string $text, ?string $date, ?string $name): array
{
    $entry = [
        'text' => $text,
        'date' => $date,
        'name' => $name,
        'month' => NUMERIC_MONTHS[$monthName],
        // 'day' ou 'customDay' ajouté ci-dessous le cas échéant.
        '_resolved' => true, // marqueur interne, retiré avant écriture
    ];

    if (null === $date) {
        $entry['_resolved'] = false;

        return $entry;
    }

    // Date fixe : « 1er janvier », « 4 janvier », ...
    $dateRegex = '/^([0-9]+)(er)?\s'.preg_quote($monthName, '/').'/iu';
    if (preg_match($dateRegex, $date, $m)) {
        $entry['day'] = (int) $m[1];

        return $entry;
    }

    // Date relative : « 2e lundi de février » -> « second monday of february »
    $ordinalRegex = '/^('.implode('|', array_map(
        static fn ($k) => preg_quote($k, '/'),
        array_keys(ORDINALS)
    )).')\s('.implode('|', array_keys(DAYS)).')/iu';
    if (preg_match($ordinalRegex, $date, $m)) {
        $ordinal = ORDINALS[mb_strtolower($m[1])];
        $day = DAYS[mb_strtolower($m[2])];
        $entry['customDay'] = $ordinal.' '.$day.' of '.ENGLISH_MONTHS[$monthName];

        return $entry;
    }

    // Aucun motif : entrée conservée mais non résolue (à vérifier à la main).
    $entry['_resolved'] = false;

    return $entry;
}

/**
 * Parcourt le HTML rendu et renvoie les journées groupées par mois français
 * (ordre d'apparition préservé).
 *
 * @return array<string, list<array>>
 */
function extractDaysByMonth(string $html): array
{
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    // Préfixe pour forcer l'UTF-8, le HTML est un fragment.
    $doc->loadHTML(
        '<?xml encoding="utf-8"?><body>'.$html.'</body>',
        LIBXML_NOERROR | LIBXML_NOWARNING
    );
    libxml_clear_errors();

    $xpath = new DOMXPath($doc);

    // On supprime toutes les références (sup.reference) comme le script JS.
    foreach (iterator_to_array($xpath->query('//sup[contains(@class, "reference")]')) as $ref) {
        $ref->parentNode->removeChild($ref);
    }

    $root = $xpath->query('//div[contains(@class, "mw-parser-output")]')->item(0);
    if (null === $root) {
        throw new RuntimeException('Conteneur mw-parser-output introuvable dans le HTML.');
    }

    $byMonth = [];
    $currentMonth = null;

    foreach ($root->childNodes as $child) {
        if (XML_ELEMENT_NODE !== $child->nodeType) {
            continue;
        }

        $tag = strtolower($child->nodeName);

        // Titre de section : on (re)positionne le mois courant. Tout titre qui
        // n'est pas un mois (références, voir aussi, ...) remet le mois à null
        // pour ne pas rattacher de listes parasites au dernier mois.
        if ('div' === $tag && false !== strpos((string) $child->getAttribute('class'), 'mw-heading')) {
            $heading = firstChildElement($child, 'h2') ?? firstChildElement($child, 'h3');
            $id = null !== $heading ? $heading->getAttribute('id') : '';
            if (isset(NUMERIC_MONTHS[$id])) {
                $currentMonth = $id;
                $byMonth[$currentMonth] ??= [];
            } else {
                $currentMonth = null;
            }
            continue;
        }

        if ('ul' === $tag && null !== $currentMonth) {
            parseMonthList($child, $currentMonth, $byMonth[$currentMonth]);
        }
    }

    return $byMonth;
}

/* ----------------------------- helpers DOM ------------------------- */

/** Itère les enfants directs d'un certain tag. */
function childElements(DOMNode $node, string $tag): array
{
    $out = [];
    foreach ($node->childNodes as $child) {
        if (XML_ELEMENT_NODE === $child->nodeType && strtolower($child->nodeName) === $tag) {
            $out[] = $child;
        }
    }

    return $out;
}

/** Premier enfant direct d'un certain tag, ou null. */
function firstChildElement(DOMNode $node, string $tag): ?DOMElement
{
    foreach ($node->childNodes as $child) {
        if (XML_ELEMENT_NODE === $child->nodeType && strtolower($child->nodeName) === $tag) {
            return $child;
        }
    }

    return null;
}

/** Remplace la première occurrence de $search dans $subject. */
function str_replace_first(string $search, string $replace, string $subject): string
{
    $pos = strpos($subject, $search);
    if (false === $pos) {
        return $subject;
    }

    return substr_replace($subject, $replace, $pos, strlen($search));
}

/* ----------------------------- sérialisation ----------------------- */

function jenc($value): string
{
    return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
}

/** Sérialise une entrée dans le style des fichiers existants. */
function formatEntry(array $entry, int $base): string
{
    unset($entry['_resolved']);
    $pad = str_repeat(' ', $base + 4);
    $lines = [];
    foreach ($entry as $key => $value) {
        $lines[] = $pad.jenc((string) $key).': '.jenc($value);
    }

    return "{\n".implode(",\n", $lines)."\n".str_repeat(' ', $base).'}';
}

/** Liste plate -> chaîne JSON dans le style du fichier existant. */
function formatFlat(array $byMonth): string
{
    $entries = [];
    foreach ($byMonth as $monthEntries) {
        foreach ($monthEntries as $entry) {
            $entries[] = formatEntry($entry, 0);
        }
    }

    return '['.implode(', ', $entries).']';
}

/** Groupé par mois -> chaîne JSON dans le style du fichier existant. */
function formatByMonth(array $byMonth): string
{
    $parts = [];
    foreach ($byMonth as $monthName => $monthEntries) {
        $items = array_map(static fn ($e) => formatEntry($e, 4), $monthEntries);
        $parts[] = '    '.jenc($monthName).': ['.implode(', ', $items).']';
    }

    return "{\n".implode(",\n", $parts)."\n}";
}

/** Enrobe le JSON dans le fichier PHP (commentaire d'année + heredoc). */
function wrapPhp(string $json, int $year): string
{
    return "<?php\n\n// $year\n\nreturn <<<EOF\n".$json."\nEOF;\n";
}

/* ------------------------------- main ------------------------------ */

$options = getopt('', ['rebuild-cache', 'year::']);
$year = isset($options['year']) && '' !== $options['year']
    ? (int) $options['year']
    : (int) date('Y');

try {
    fwrite(STDERR, "Téléchargement de l'article Wikipédia...\n");
    $html = fetchWikipediaHtml();

    fwrite(STDERR, "Extraction des journées internationales...\n");
    $byMonth = extractDaysByMonth($html);

    // Statistiques + entrées non résolues (à vérifier à la main).
    $total = 0;
    $unresolved = [];
    foreach ($byMonth as $monthEntries) {
        foreach ($monthEntries as $entry) {
            ++$total;
            if (false === $entry['_resolved']) {
                $unresolved[] = $entry;
            }
        }
    }

    if (0 === $total) {
        throw new RuntimeException('Aucune journée extraite : la structure de la page a probablement changé.');
    }

    file_put_contents(FLAT_FILE, wrapPhp(formatFlat($byMonth), $year));
    file_put_contents(BY_MONTH_FILE, wrapPhp(formatByMonth($byMonth), $year));

    fwrite(STDERR, sprintf(
        "%d journées extraites (%d mois) écrites dans :\n  - %s\n  - %s\n",
        $total,
        count($byMonth),
        realpath(FLAT_FILE),
        realpath(BY_MONTH_FILE)
    ));

    if ([] !== $unresolved) {
        fwrite(STDERR, sprintf(
            "\n⚠  %d entrée(s) sans date résolue (day/customDay) — à vérifier/corriger à la main :\n",
            count($unresolved)
        ));
        foreach ($unresolved as $entry) {
            fwrite(STDERR, '   • ['.$entry['date'].'] '.$entry['name']."\n");
        }
    }

    if (isset($options['rebuild-cache'])) {
        $cacheFile = CACHE_DIR.'/'.$year.'.php';
        if (is_file($cacheFile)) {
            unlink($cacheFile);
            fwrite(STDERR, "\nCache supprimé : $cacheFile (sera régénéré au prochain appel de l'API).\n");
        }
    }
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur : '.$e->getMessage()."\n");
    exit(1);
}
