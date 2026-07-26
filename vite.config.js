import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// L'API PHP est servie sur la même origine que le build en production.
// En dev, on proxifie /api.php vers un serveur PHP local (cf. README).
export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            // injectManifest : le service worker est écrit à la main dans
            // src/sw.js (cache de l'API, préchargement de l'année), Workbox
            // n'y injecte que la liste de precache.
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.js',
            // 'prompt' : la nouvelle version attend que l'utilisateur
            // l'accepte (cf. UpdateBanner.vue) au lieu de s'installer sous
            // ses pieds. L'enregistrement passe par virtual:pwa-register/vue,
            // d'où injectRegister à null.
            registerType: 'prompt',
            injectRegister: null,
            injectManifest: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,txt,webmanifest}'],
                // Les formats de police historiques pèsent 188 Ko (dont 81 pour
                // le seul .svg, que le motif ci-dessus attrape) et ne servent
                // qu'à des navigateurs sans service worker.
                globIgnores: ['fonts/*.{eot,ttf,woff,svg}']
            },
            // Les fichiers de public/ ne sont pas précachés d'office : sans
            // cette liste, le loader et la police manquent hors ligne. Des
            // cinq formats de la police, seul woff2 est repris — il est
            // couvert par tous les navigateurs qui savent faire tourner un
            // service worker, et les quatre autres pèsent 188 ko à eux seuls.
            includeAssets: [
                'favicon.ico',
                'robots.txt',
                'img/**',
                'fonts/*.woff2'
            ],
            manifest: {
                name: 'international-days',
                short_name: 'international-days',
                start_url: '/index.html',
                display: 'standalone',
                background_color: '#000000',
                theme_color: '#4DBA87',
                icons: [
                    { src: '/img/icons/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/img/icons/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
                ]
            },
            workbox: {
                // Ne jamais mettre l'API dynamique en cache de precache.
                navigateFallbackDenylist: [/^\/api\.php/]
            }
        })
    ],
    server: {
        proxy: {
            '/api.php': {
                target: process.env.VITE_API_TARGET || 'http://localhost:8000',
                changeOrigin: true
            }
        }
    }
})
