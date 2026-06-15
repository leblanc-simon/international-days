import { createApp } from 'vue'
import App from './App.vue'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(localizedFormat)
dayjs.locale('fr')

const app = createApp(App)
app.mount('#app')

app.config.globalProperties.formatedMonth = month => {
    if (month < 0 || month > 11 || month === null) {
        return null
    }
    return dayjs(new Date(2018, month, 1)).format('MMMM')
}

app.config.globalProperties.formatedDate = date => {
    if (!date) {
        return null
    }
    return dayjs(date).format('dddd LL')
}
