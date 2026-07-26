import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// L'API PHP est servie sur la même origine que le build en production.
// En dev, on proxifie /api.php vers un serveur PHP local (cf. README).
export default defineConfig({
    plugins: [
        vue(),
        VitePWA({
            registerType: 'autoUpdate',
            injectRegister: 'auto',
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
