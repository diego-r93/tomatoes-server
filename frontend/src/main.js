// Components
import App from './App.vue'
import router from './router'

// Composables
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import initGridLayout from 'vue-grid-layout';

// Plugins
import { registerPlugins } from '@/plugins'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

registerPlugins(app)
initGridLayout(app)

app.use(router).mount('#app')
