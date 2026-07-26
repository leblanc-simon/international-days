<template>
    <div class="international-day" v-if="loaded">
        <div class="title">{{ formatedDate(date) }}</div>
        <div class="stale" v-if="stale">
            Données enregistrées hors ligne : elles ne sont plus à jour.
        </div>
        <div v-if="internationalDays.length" class="">
            <ul>
                <li v-for="internationalDay in internationalDays"
                    v-bind:key="internationalDay.name"
                >
                    {{ internationalDay.name }}
                </li>
            </ul>
        </div>
        <div class="nothing" v-else>
            Aucune journée internationale, aujourd'hui...
        </div>
    </div>
    <div class="unavailable" v-else-if="failed">
        Journées du jour indisponibles : aucune connexion et rien en cache.
    </div>
    <div v-else>
        <waiting-loader></waiting-loader>
    </div>
</template>

<script>
import { getJson } from '../api'
import WaitingLoader from './WaitingLoader.vue'

// Date locale au format de l'API (Y-m-d), sans passer par UTC.
const today = () => {
    const now = new Date()

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-')
}

export default {
    name: 'InternationalDay',
    components: { WaitingLoader },
    data () {
        return {
            loaded: false,
            failed: false,
            stale: false,
            internationalDays: [],
            date: null
        }
    },
    created () {
        getJson('/api.php')
            .then(data => {
                this.loaded = true
                this.internationalDays = data.datas
                this.date = data.date
                // Hors ligne, le service worker peut servir la réponse d'un
                // jour précédent : autant le dire plutôt que d'afficher une
                // date passée sans explication.
                this.stale = data.date !== today()
            })
            .catch(() => {
                // Ni réseau ni cache : sans cela, le loader tournerait
                // indéfiniment.
                this.failed = true
            })
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="css">
.international-day {
    background: #282828;
    color: #ffffff;
    padding: 4rem;
}
.title {
    font-size: 3rem;
    margin-bottom: 3rem;
}
ul {
    list-style-type: square;
    padding: 0 2rem;
    font-size: 1.5rem;
}
li {
    margin: 0.5rem 0;
    &:first-letter {
        text-transform: uppercase;
    }
}
.nothing {
    font-size: 1.5rem;
}
.stale {
    /* remonte sous le titre, qui porte déjà une marge de 3rem */
    margin: -2rem 0 2rem 0;
    font-size: 1rem;
    opacity: 0.85;
}
.unavailable {
    background: #282828;
    color: #ffffff;
    padding: 4rem;
    font-size: 1.5rem;
}
</style>
