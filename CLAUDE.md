# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Présentation

Application web (Vue 3 + Vite) affichant les journées internationales du jour et permettant de parcourir celles de chaque mois. Les données proviennent de la page Wikipedia « Journée internationale » (licence CC BY-SA).

## Commandes

Un `Makefile` couvre le quotidien (`make` seul affiche l'aide) :

```bash
make run              # Vite + le serveur PHP de l'API, Ctrl-C arrête les deux
make build            # build de production dans dist/
make lint             # eslint sur src/
make install          # pnpm install
```

`make run` est le seul vrai raccourci : il évite d'ouvrir deux terminaux, puisque le front a besoin du serveur PHP en parallèle (voir plus bas). `PHP_HOST` (défaut `localhost:8000`) permet de changer le port de l'API. Chaque cible dépend de `node_modules`, réinstallé automatiquement dès que `package.json` ou `pnpm-lock.yaml` change.

Le projet est passé de yarn à pnpm (présence de `pnpm-lock.yaml`, `yarn.lock` supprimé). Utiliser pnpm.

```bash
pnpm install          # installer les dépendances
pnpm dev              # dev avec hot-reload (vite) — alias : pnpm serve
pnpm build            # build de production dans dist/ (vite build)
pnpm preview          # prévisualiser le build de production (vite preview)
pnpm lint             # eslint src (sans --fix ; le hook pre-commit, lui, corrige)
```

En dev, l'API PHP est proxifiée : `vite.config.js` redirige `/api.php` vers `process.env.VITE_API_TARGET` (défaut `http://localhost:8000`). Lancer un serveur PHP en parallèle, ex. `php -S localhost:8000 -t public`.

**Aucun script `test`** dans `package.json` ni de suite de tests dans le dépôt.

### Audit de sécurité

`pnpm audit` doit rester vert. Un avis y est explicitement ignoré, dans `pnpm-workspace.yaml` (`auditConfig.ignoreGhsas`) : **GHSA-mh99-v99m-4gvg** sur `brace-expansion`. Le correctif n'existe que sur la branche 5.x, et forcer cette majeure **casse `minimatch`** — l'export CJS y passe de la fonction à un objet `{ expand }`, d'où un « expand is not a function » sur tout motif à accolades. Le paquet arrive au 7e niveau d'une chaîne de construction (`vite-plugin-pwa > workbox-build > … > minimatch@5`) qui ne traite que nos propres motifs. À réexaminer dès qu'une 2.x corrigée paraît.

Note : les overrides et `auditConfig` vivent dans **`pnpm-workspace.yaml`**, pas dans `package.json` — pnpm 11 ne lit plus le champ `pnpm` du manifeste (il l'ignore silencieusement, avec un simple avertissement).

Les hooks git sont gérés par **`simple-git-hooks`** (`simple-git-hooks.pre-commit` → `pnpm exec lint-staged`). Le hook est (ré)installé par le postinstall de `simple-git-hooks` ; `lint-staged` lance `eslint --fix` sur les fichiers `src/**/*.{js,vue}` indexés. L'autorisation du script de build est dans `pnpm-workspace.yaml` (`allowBuilds.simple-git-hooks: true`).

## Architecture

L'application combine un **frontend Vue 3** statique et un **backend PHP minimal** servi à côté du build. Le frontend appelle `api.php` via axios ; il n'y a pas de serveur Node en production.

### Flux de données (essentiel à comprendre)

1. **Extraction** — `datas/extract-from-wikipedia.js` est un script à coller dans la console du navigateur sur la page Wikipedia. Il parse le DOM (`#mw-content-text`), regroupe les journées par mois, puis `cleanData()` normalise chaque entrée : ajoute `month` (numérique), `day` (date fixe) ou `customDay` (date relative en anglais, ex. `"third sunday of may"`, prête pour `new DateTime()` en PHP).
2. **Données sources** — la sortie est copiée à la main dans `datas/international-days.json.php` (liste à plat) et `datas/international-days-by-month.json.php` (groupé par mois français). Ce sont des fichiers PHP qui `return` un heredoc JSON ; ils portent en commentaire l'année de référence.
3. **Cache** — `bin/build-cache.php` lit `international-days.json.php`, résout chaque entrée en date `Y-m-d` pour **l'année courante** (`buildDate()` gère `day`/`month` fixes et `customDay` relatifs), puis écrit `cache/<ANNÉE>.php` contenant deux tableaux : `$international_days` (indexé par date) et `$international_days_by_month` (indexé par mois numérique, trié par date). Le cache est régénéré automatiquement à chaque changement d'année.
4. **API** — `public/api.php` charge `cache/<ANNÉE>.php` (le construit s'il manque) et répond en JSON :
   - sans paramètre → `{ date, datas }` pour aujourd'hui ;
   - `?month=N` (1-12) → liste des journées du mois.

   Les réponses passent par `respond()`, qui pose `Cache-Control: public, max-age=<jusqu'à minuit>` et un `ETag` (md5 du corps) et répond `304` sur `If-None-Match`. Le TTL suit exactement la bascule de `date('Y-m-d')`, donc **dans le fuseau du serveur** (`date.timezone`) : une mise à jour des données en cours de journée n'est visible qu'au lendemain. En développement, prévoir un rechargement forcé ou « Disable cache » dans les DevTools. Une réponse `500` part en `no-store`.

### Frontend

- `src/main.js` : crée l'app Vue 3, monte `#app`, configure **dayjs** (locale `fr` + plugin `localizedFormat`, défini une seule fois globalement) et expose `formatedMonth`/`formatedDate` comme `globalProperties`.
- `src/components/InternationalDay.vue` : appelle `GET /api.php` (journées du jour).
- `src/components/InternationalDayCalendar.vue` : appelle `GET /api.php?month=N`, navigation mois précédent/suivant ; `convertByDay()` regroupe la liste plate par date pour l'affichage.
- `apiBaseUrl` est codé en dur à `''` dans les deux composants (API servie sur la même origine que le build).
- `index.html` est à la **racine** du projet (point d'entrée Vite), pas dans `public/`. Les assets de `public/` (polices, icônes, `loader.svg`, `api.php`) se référencent en chemin **absolu** (`/fonts/...`, `/img/...`) et sont copiés tels quels dans `dist/`.
### PWA et fonctionnement hors ligne

**L'application est entièrement utilisable hors ligne**, y compris pour un mois jamais ouvert.

- `vite-plugin-pwa` en **`strategies: 'injectManifest'`** : le service worker est **`src/sw.js`**, versionné et modifiable — Workbox n'y injecte que la liste de precache. C'est là qu'on intervient pour changer une stratégie de cache. Le `manifest.webmanifest` reste généré par le plugin, et le SW n'est actif qu'en production.
- Precache : 22 fichiers, 183 Ko. Les fichiers de `public/` ne sont **pas** repris d'office : d'où `includeAssets` (`img/**`, `fonts/*.woff2`) et surtout `injectManifest.globIgnores` qui écarte `fonts/*.{eot,ttf,woff,svg}` — le `.svg` de la police pèse à lui seul 81 Ko et le motif `**/*.svg` l'attraperait.
- `/api.php` passe par une stratégie **`NetworkFirst`** (cache `api-data-v1`, délai réseau 4 s, expiration 30 jours) : en ligne les données sont toujours fraîches, le cache ne sert qu'en secours. Incrémenter le suffixe de `API_CACHE` repart d'un cache vide, l'ancien étant supprimé à l'activation.
- **Préchargement de l'année à l'installation** : `warmApiCache()` demande le jour courant plus les douze mois (13 requêtes, ~19 Ko). Il passe par la stratégie et non par `cache.put()`, pour que l'expiration reste cohérente. Un échec ne fait pas échouer l'installation. L'application le redéclenche ensuite une fois par jour via le message `WARM_API_CACHE` (garde-fou `localStorage`, cf. `UpdateBanner.vue`), afin de rafraîchir les mois jamais ouverts.
- **Mise à jour en `registerType: 'prompt'`** : `UpdateBanner.vue` (via `virtual:pwa-register/vue`) affiche un bandeau et n'applique la nouvelle version que sur clic — le SW n'appelle `skipWaiting()` qu'à réception du message `SKIP_WAITING`. `injectRegister` est donc à `null` : c'est le composant qui enregistre le SW.
- Les trois appels du calendrier passent par `load(month)`, et les deux composants ont un **`.catch()`** : sans réseau ni cache, un message s'affiche au lieu du loader tournant indéfiniment. `InternationalDay` signale en plus des données périmées quand la date reçue n'est pas celle du jour.
- Le cache HTTP de `api.php` (cf. plus haut) fait une première ligne de défense : même cache SW vidé, le navigateur peut resservir les réponses tant que le `max-age` court.

### Publication Mattermost

`bin/publish_mattermost.php` (script CLI, ex. cron quotidien) lit le cache, formate les journées du jour et POST un payload vers `MATTERMOST_KOOK_URL`. Cette constante est définie dans `bin/config.php` (gitignored ; copier depuis `bin/config.php.dist`).

## Mise à jour annuelle des données

### Automatique (recommandé)

`bin/update-datas.php` automatise toute la procédure : il récupère le HTML rendu de l'article via l'API MediaWiki (`action=parse`), applique la même logique d'extraction que `extract-from-wikipedia.js` (avec `DOMDocument`/`DOMXPath`, sans dépendance externe) et réécrit les deux fichiers `datas/*.json.php` dans leur format exact.

```bash
php bin/update-datas.php                 # met à jour les deux fichiers (année courante)
php bin/update-datas.php --rebuild-cache # + supprime cache/<ANNÉE>.php pour forcer sa régénération
php bin/update-datas.php --year=2027     # force l'année de référence du commentaire
```

Le script affiche le nombre de journées extraites et **liste les entrées dont la date n'a pas pu être résolue** (`day`/`customDay` absents). Ces cas, déjà signalés par `console.warn` dans le script JS d'origine, sont conservés tels quels et doivent être corrigés/complétés à la main si besoin.

Les formulations approximatives de l'article sont ramenées à une date exploitable (`buildEntry()` / `normalizeDate()`) :

| Sur la page | Résultat |
| --- | --- |
| `6 / 8 février`, `21 ou 22 décembre` | premier jour cité (`day`) |
| `À partir du 20 avril` | `day: 20` — préfixes `à partir du`, `vers le`, `le` retirés |
| `Équinoxe (20 ou 21 mars)` | `day: 20` — c'est la parenthèse qui porte la date |
| `28 ou 29 février` | `customDay: last day of february` (suit les années bissextiles) |
| `3e week-end` | `customDay: third saturday of september` — le samedi, mois déduit de la section |

La constante `OVERRIDES` (clé = nom exact de la journée) force la date des entrées que l'article ne date pas du tout, comme « journée mondiale anti-contrefaçon » (« En juin » — la date réelle change chaque année). Elle prime sur tout le reste.

**Ces règles vivent dans le script, pas dans les données** : corriger `datas/*.json.php` à la main serait écrasé à la prochaine exécution.

### Manuelle (méthode historique)

1. Exécuter `datas/extract-from-wikipedia.js` dans la console sur la page Wikipedia.
2. Remplacer le contenu JSON des deux fichiers `datas/*.json.php` (mettre à jour le commentaire d'année).
3. Supprimer `cache/<ANNÉE>.php` (ou laisser `build-cache.php` le régénérer) — `cache/` est gitignored.

`cleanData()` applique les mêmes règles de normalisation et la même table `overrides` que `bin/update-datas.php` : **les deux scripts doivent rester alignés** (sur les données actuelles, ils résolvent les 215 entrées à l'identique). Le script JS est hors du périmètre d'ESLint (`lint` et le hook pre-commit ne visent que `src/`) : c'est du code de console, pas du code applicatif.

## Conventions

- ESLint 10 en **flat config** (`eslint.config.mjs` — extension `.mjs` car le paquet n'est pas `"type": "module"`). Le préréglage `@vue/eslint-config-standard` a été retiré : il plafonne à ESLint 9. Le style est désormais composé sur place — `@eslint/js` recommended + `eslint-plugin-vue` (`flat/essential`) + `@stylistic/eslint-plugin` via `configs.customize({ indent: 4, quotes: 'single', semi: false, commaDangle: 'never', braceStyle: '1tbs' })`, complété par le volet non stylistique de « standard » (`eqeqeq`, `prefer-const`, `no-var`, `curly`…).
- Cinq règles s'écartent volontairement des valeurs par défaut de `@stylistic` pour coller au code existant : `space-before-function-paren: always` (`data () {}`), `arrow-parens: off` (`month => {}`), `quotes` avec `avoidEscape`, `quote-props: as-needed`, `operator-linebreak: after`. **Y toucher réécrirait tous les fichiers au prochain `--fix`.**
- Non repris de « standard » : les règles issues de `eslint-plugin-import-x`, `-n` et `-promise` (14 au total), pour ne pas traîner trois greffons de plus. Les règles Vue 2 disparues (`vue/no-v-model-argument`, `vue/valid-v-bind-sync`…) ne s'appliquaient de toute façon pas à ce projet Vue 3.
- `no-console`/`no-debugger` en erreur uniquement en production (`NODE_ENV`).
- `cache/`, `dist/`, `bin/config.php` et les fichiers `.env*.local` sont gitignored.
