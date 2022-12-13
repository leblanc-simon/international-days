import { createApp } from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import moment from 'moment/moment'

const app = createApp(App)
app.mount('#app')
app.config.globalProperties.formatedMonth = month => {
    if (month < 0 || month > 11 || month === null) {
        return null
    }
    return moment([2018, month]).format('MMMM')
}

app.config.globalProperties.formatedDate = date => {
    if (!date) {
        return null
    }
    return moment(date).format('dddd LL')
}
