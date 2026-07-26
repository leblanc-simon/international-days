// Service worker de l'application (stratégie injectManifest : ce fichier est
// pris tel quel, Workbox n'y injecte que la liste de precache).
//
// Trois responsabilités :
//   1. servir la coquille de l'app depuis le precache ;
//   2. garder les réponses de /api.php dans un cache dédié, pour que
//      l'application reste consultable hors ligne ;
//   3. précharger l'année entière (13 requêtes, ~19 Ko) dès l'installation,
//      afin que même un mois jamais ouvert s'affiche sans réseau.

import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'

// Incrémenter pour repartir d'un cache de données vide (le nom du cache
// change, l'ancien est supprimé à l'activation).
const API_CACHE = 'api-data-v1'

// Au-delà, une réponse gardée hors ligne est considérée comme trop vieille
// pour être servie. Large à dessein : mieux vaut des données de la semaine
// passée qu'un écran vide.
const API_MAX_AGE = 60 * 60 * 24 * 30

const API_PATH = '/api.php'

/* ------------------------------ precache -------------------------------- */

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Toute navigation retombe sur index.html (SPA), sauf l'API.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\.php/]
}))

/* -------------------------------- API ----------------------------------- */

// NetworkFirst : en ligne on affiche toujours des données fraîches, le cache
// ne prend le relais qu'en cas d'échec ou de réseau trop lent.
const apiStrategy = new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 4,
    plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({
            maxEntries: 20, // 12 mois + le jour courant, avec de la marge
            maxAgeSeconds: API_MAX_AGE,
            purgeOnQuotaError: true
        })
    ]
})

registerRoute(({ url }) => url.pathname === API_PATH, apiStrategy)

/* -------------------- préchargement de l'année entière ------------------- */

// Le jour courant, puis les douze mois.
const apiRequests = () => {
    const requests = [new Request(API_PATH)]
    for (let month = 1; month <= 12; ++month) {
        requests.push(new Request(API_PATH + '?month=' + month))
    }

    return requests
}

// On passe par la stratégie plutôt que d'écrire dans le cache en direct :
// les greffons (expiration, filtrage des statuts) restent ainsi cohérents.
const warmApiCache = async event => {
    const results = await Promise.allSettled(
        apiRequests().map(request => apiStrategy.handle({ event, request }))
    )

    return results.filter(result => result.status === 'fulfilled').length
}

self.addEventListener('install', event => {
    // Le préchargement ne doit pas faire échouer l'installation : sans réseau,
    // le service worker s'installe quand même et se remplira plus tard.
    event.waitUntil(warmApiCache(event).catch(() => 0))
})

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(names => Promise.all(
        names
            .filter(name => name.startsWith('api-data-') && name !== API_CACHE)
            .map(name => caches.delete(name))
    )))
})

/* ------------------------------ messages -------------------------------- */

self.addEventListener('message', event => {
    const type = event.data && event.data.type

    // Envoyé par le bandeau « nouvelle version » : c'est l'utilisateur qui
    // décide du moment où la mise à jour prend effet.
    if (type === 'SKIP_WAITING') {
        self.skipWaiting()

        return
    }

    // Envoyé par l'application une fois par jour, pour rafraîchir les mois
    // que l'utilisateur n'ouvre jamais.
    if (type === 'WARM_API_CACHE') {
        event.waitUntil(warmApiCache(event).catch(() => 0))
    }
})

clientsClaim()
