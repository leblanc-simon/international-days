<template>
    <div class="international-day" v-if="loaded">
        <div class="title">{{ formatedDate(date) }}</div>
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
    <div v-else>
        <waiting-loader></waiting-loader>
    </div>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import WaitingLoader from './WaitingLoader.vue'

const apiBaseUrl = ''
moment.locale('fr')

export default {
    name: 'InternationalDay',
    components: { WaitingLoader },
    data () {
        return {
            loaded: false,
            internationalDays: [],
            date: null
        }
    },
    created () {
        axios.get(apiBaseUrl + '/api.php')
            .then(response => {
                this.loaded = true
                this.internationalDays = response.data.datas
                this.date = response.data.date
            })
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
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
</style>
