/**
 * plugins/index.js
 *
 * Automatically included in `./src/main.ts`
 */

import type { App } from 'vue';

// Plugins
import vuetify from './vuetify'
import pinia from '../store'
import router from '../router'

export function registerPlugins (app: App) {
  app
    .use(vuetify)
    .use(router)
    .use(pinia)
}
