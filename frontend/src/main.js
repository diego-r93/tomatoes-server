// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'
import initGridLayout from 'vue-grid-layout';

// Plugins
import { registerPlugins } from '@/plugins'

const app = createApp(App)

registerPlugins(app)
initGridLayout(app)

app.mount('#app')
