<template>
    <div id="app">
        <InternationalDay/>
        <InternationalDayCalendar/>
        <footer>
            Les données proviennent de <a href="https://fr.wikipedia.org/wiki/Journ%C3%A9e_internationale">Wikipedia</a>
            et sont sous license <a href="https://creativecommons.org/licenses/by-sa/3.0/deed.fr">Creative Commons BY-SA</a>
        </footer>
    </div>
</template>

<script>
import InternationalDay from './components/InternationalDay.vue'
import InternationalDayCalendar from './components/InternationalDayCalendar.vue'

export default {
    name: 'app',
    components: {
        InternationalDay,
        InternationalDayCalendar
    }
}
</script>

<style lang="scss">
/* varela-round-regular - latin */
@font-face {
    font-family: 'Varela Round';
    font-style: normal;
    font-weight: 400;
    src: url('../public/fonts/varela-round-v9-latin-regular.eot'); /* IE9 Compat Modes */
    src: local('Varela Round Regular'), local('VarelaRound-Regular'),
    url('../public/fonts/varela-round-v9-latin-regular.eot?#iefix') format('embedded-opentype'), /* IE6-IE8 */
    url('../public/fonts/varela-round-v9-latin-regular.woff2') format('woff2'), /* Super Modern Browsers */
    url('../public/fonts/varela-round-v9-latin-regular.woff') format('woff'), /* Modern Browsers */
    url('../public/fonts/varela-round-v9-latin-regular.ttf') format('truetype'), /* Safari, Android, iOS */
    url('../public/fonts/varela-round-v9-latin-regular.svg#VarelaRound') format('svg'); /* Legacy iOS */
}
html, body {
  margin: 0;
  padding: 0 0 1rem 0;
  font-family: 'Varela Round', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #282828;
}
footer {
    position: fixed;
    bottom: 0;
    background: #282828;
    left: 0;
    right: 0;
    padding: 0.3rem;
    color: #ffffff;
    text-align: right;
    font-size: 0.8rem;
    a {
        color: inherit;
    }
}
</style>
