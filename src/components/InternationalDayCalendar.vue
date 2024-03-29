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
    </div>
    <div v-else>
        <waiting-loader></waiting-loader>
    </div>
</template>

<script>
import axios from 'axios'
import moment from 'moment'
import WaitingLoader from './WaitingLoader.vue'

moment.locale('fr')
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
            internationalDays: [],
            previousMonth: currentPreviousMonth,
            currentMonth: date.getMonth(),
            nextMonth: currentNextMonth
        }
    },
    created () {
        axios.get(apiBaseUrl + '/api.php?month=' + (this.currentMonth + 1))
            .then(response => {
                this.loaded = true
                this.internationalDays = convertByDay(response.data)
            })
    },
    methods: {
        next () {
            axios.get(apiBaseUrl + '/api.php?month=' + (nextMonth(this.currentMonth) + 1))
                .then(response => {
                    this.internationalDays = convertByDay(response.data)
                    this.previousMonth = this.currentMonth
                    this.currentMonth = nextMonth(this.currentMonth)
                    this.nextMonth = nextMonth(this.currentMonth)
                })
        },
        previous () {
            axios.get(apiBaseUrl + '/api.php?month=' + (previousMonth(this.currentMonth) + 1))
                .then(response => {
                    this.internationalDays = convertByDay(response.data)
                    this.nextMonth = this.currentMonth
                    this.currentMonth = previousMonth(this.currentMonth)
                    this.previousMonth = previousMonth(this.currentMonth)
                })
        }
    }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
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
