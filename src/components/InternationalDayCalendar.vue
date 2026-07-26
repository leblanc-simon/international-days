<template>
    <div class="international-day-calendar" v-if="loaded">
        <nav>
            <div class="previous">
                <span v-if="previousMonth >= 0" v-on:click="previous" class="link">{{ formatedMonth(previousMonth) }}</span>
            </div>
            <div class="current"><span>{{ formatedMonth(currentMonth) }}</span></div>
            <div class="next">
                <span v-if="nextMonth" v-on:click="next" class="link">{{ formatedMonth(nextMonth) }}</span>
            </div>
        </nav>
        <div v-if="internationalDays.length" class="">
            <ul>
                <li v-for="internationalDayGrouped in internationalDays"
                    v-bind:key="internationalDayGrouped.date"
                >
                    <span class="date">{{ formatedDate(internationalDayGrouped.date) }} :</span>
                    <ul>
                        <li v-for="internationalDay in internationalDayGrouped.internationalDays"
                            v-bind:key="internationalDay"
                        >
                            <span class="name">{{ internationalDay }}</span>
                        </li>
                    </ul>
                </li>
            </ul>
        </div>
        <div class="unavailable" v-if="failed">
            Ce mois n'est pas disponible hors ligne.
        </div>
    </div>
    <div class="unavailable" v-else-if="failed">
        Calendrier indisponible : aucune connexion et rien en cache.
    </div>
    <div v-else>
        <waiting-loader></waiting-loader>
    </div>
</template>

<script>
import axios from 'axios'
import WaitingLoader from './WaitingLoader.vue'

const apiBaseUrl = ''

const previousMonth = currentMonth => {
    if (currentMonth === 0) {
        return null
    }
    return currentMonth - 1
}

const nextMonth = currentMonth => {
    if (currentMonth === 11) {
        return null
    }
    return currentMonth + 1
}

const convertByDay = internationalDays => {
    let currentDay
    let currentIterator = 0
    const datas = []
    internationalDays.forEach(internationalDay => {
        if (currentDay !== internationalDay.date) {
            datas.push({
                date: internationalDay.date,
                internationalDays: []
            })
            currentIterator = datas.length - 1
            currentDay = internationalDay.date
        }
        datas[currentIterator].internationalDays.push(internationalDay.name)
    })
    return datas
}

export default {
    name: 'InternationalDayCalendar',
    components: { WaitingLoader },
    data () {
        const date = new Date()
        const currentPreviousMonth = previousMonth(date.getMonth())
        const currentNextMonth = nextMonth(date.getMonth())
        return {
            loaded: false,
            failed: false,
            internationalDays: [],
            previousMonth: currentPreviousMonth,
            currentMonth: date.getMonth(),
            nextMonth: currentNextMonth
        }
    },
    created () {
        this.load(this.currentMonth)
    },
    methods: {
        // Point d'entrée unique des trois chargements : on ne bascule sur le
        // mois demandé qu'une fois ses données obtenues, et un échec laisse
        // donc le mois courant affiché.
        load (month) {
            axios.get(apiBaseUrl + '/api.php?month=' + (month + 1))
                .then(response => {
                    this.internationalDays = convertByDay(response.data)
                    this.currentMonth = month
                    this.previousMonth = previousMonth(month)
                    this.nextMonth = nextMonth(month)
                    this.loaded = true
                    this.failed = false
                })
                .catch(() => {
                    this.failed = true
                })
        },
        next () {
            this.load(nextMonth(this.currentMonth))
        },
        previous () {
            this.load(previousMonth(this.currentMonth))
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="css">
.unavailable {
    padding: 2rem;
    text-align: center;
    font-size: 1.2rem;
}
nav {
    display: flex;
    padding: 1rem;
    background: #ffffff;
    position: sticky;
    top: 0;
    div {
        flex: 1 1 auto;
        text-align: center;
        span {
            cursor: pointer;
            display: inline-block;
            position: relative;
            width: 75%;
            padding: 0.5rem;
            border-radius: 0.5rem;
        }
        .link {
            transition: all 0.3s;
            &:hover {
                background: #282828;
                color: #ffffff;
            }
        }
        &.previous .link:hover:before {
            content: '<<';
            position: absolute;
            left: 1rem;
        }
        &.next .link:hover:after {
            content: '>>';
            position: absolute;
            right: 1rem;
        }
    }
    .current span {
        background: #282828;
        color: #ffffff;
    }
}
.date {
    font-weight: bold;
}
div > ul {
    list-style: none;
    &>li {
        margin-bottom: 1rem;
        li {
            margin: 0.3rem 0.5rem;
        }
    }
}
</style>
