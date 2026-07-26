<template>
    <div v-if="needRefresh || offlineReady" class="update-banner" role="status" aria-live="polite">
        <span v-if="needRefresh">Une nouvelle version est disponible.</span>
        <span v-else>Application prête pour une utilisation hors ligne.</span>
        <button v-if="needRefresh" type="button" class="reload" v-on:click="reload">Recharger</button>
        <button type="button" class="close" v-on:click="dismiss" aria-label="Fermer">×</button>
    </div>
</template>

<script>
import { useRegisterSW } from 'virtual:pwa-register/vue'

// Le service worker précharge l'année à l'installation ; passé ce jour-là, il
// faut lui redemander de rafraîchir les mois que l'utilisateur n'ouvre pas.
const WARM_KEY = 'api-cache-warmed-on'

const warmApiCacheOncePerDay = registration => {
    const today = new Date().toISOString().slice(0, 10)

    try {
        if (window.localStorage.getItem(WARM_KEY) === today) {
            return
        }
        window.localStorage.setItem(WARM_KEY, today)
    } catch {
        // Stockage indisponible (navigation privée) : on rafraîchit quand même.
    }

    const worker = registration && (registration.active || navigator.serviceWorker.controller)
    if (worker) {
        worker.postMessage({ type: 'WARM_API_CACHE' })
    }
}

export default {
    name: 'UpdateBanner',
    setup () {
        const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
            onRegisteredSW (swUrl, registration) {
                if (navigator.onLine) {
                    warmApiCacheOncePerDay(registration)
                }
            }
        })

        return { needRefresh, offlineReady, updateServiceWorker }
    },
    methods: {
        reload () {
            this.updateServiceWorker(true)
        },
        dismiss () {
            this.needRefresh = false
            this.offlineReady = false
        }
    }
}
</script>

<style scoped lang="css">
.update-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    display: flex;
    gap: 0.6rem;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    background: #4DBA87;
    color: #ffffff;
    font-size: 0.9rem;
    button {
        font: inherit;
        color: inherit;
        background: transparent;
        border: 1px solid currentColor;
        border-radius: 3px;
        padding: 0.1rem 0.5rem;
        cursor: pointer;
    }
    .close {
        border: 0;
        font-size: 1.2rem;
        line-height: 1;
    }
}
</style>
