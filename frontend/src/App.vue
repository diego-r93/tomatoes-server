<template>
  <v-app :theme="theme">
    <component :is="currentLayout" v-if="isRouterLoaded">
      <router-view></router-view>
    </component>
  </v-app>
</template>

<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import DefaultLayout from "@/layouts/DefaultLayout.vue"
import AuthLayout from "@/layouts/AuthLayout.vue"
import UserInterfaceLayout from "@/layouts/UserInterfaceLayout.vue"

// Importado do Pinia
import { useAppStore } from '@/store/appConfiguration'

// Importado do Pinia
const userTheme = useAppStore()
const theme = computed(() => userTheme.theme)
const route = useRoute()

const isRouterLoaded = computed(() => {
  return route.name !== null ? true : false
})

const layouts = {
  default: DefaultLayout,
  auth: AuthLayout,
  ui: UserInterfaceLayout,
}

const currentLayout = computed(() => {
  const layoutName = route.meta.layout
  if (!layoutName) {
    return DefaultLayout
  }
  return layouts[layoutName]
})
</script>

<style>
@font-face {
  font-family: 'Fira Code';
  src: url('./assets/fonts/FiraCode/FiraCode-Regular.ttf');
  font-weight: normal;
  font-style: normal;
}

body::-webkit-scrollbar {
  display: none;
  /* Oculta a barra de rolagem para navegadores WebKit como Chrome e Safari */
}

body {
  -ms-overflow-style: none;
  /* Oculta a barra de rolagem para IE e Edge */
  scrollbar-width: none;
  /* Oculta a barra de rolagem para Firefox */
}

.custom-border {
  border: 1px solid #3c3c3c;
}

.v-btn--size-default {
  --v-btn-size: 0.875rem;
  --v-btn-height: 32px;
  font-size: var(--v-btn-size);
  min-width: 36px;
  padding: 0 8px;
}
</style>