<template>
  <v-app :theme="theme" :data-density="userTheme.density" :data-reduced-motion="userTheme.reduceMotion">
    <v-defaults-provider :defaults="componentDefaults">
      <component :is="currentLayout">
        <router-view />
      </component>
    </v-defaults-provider>
  </v-app>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, watch } from "vue"
import { useTheme } from "vuetify"
import { useRoute } from "vue-router"
import DefaultLayout from "@/layouts/DefaultLayout.vue"
import AuthLayout from "@/layouts/AuthLayout.vue"
import UserInterfaceLayout from "@/layouts/UserInterfaceLayout.vue"

import { useAppStore } from '@/store/appConfiguration'

const userTheme = useAppStore()
const theme = computed(() => userTheme.theme)
const componentDefaults = computed(() => {
  const density = userTheme.density === 'compact' ? 'compact' : 'default'
  return {
    VBtn: { density },
    VAppBar: { height: 56 },
    VTextField: { density, variant: 'outlined' },
    VTextarea: { density, variant: 'outlined' },
    VSelect: { density, variant: 'outlined' },
    VSwitch: { density },
    VTable: { density },
    VPagination: { density },
  }
})
const vuetifyTheme = useTheme()
watch(theme, name => { vuetifyTheme.change(name) }, { immediate: true })
let systemAppearance
const syncSystemAppearance = () => userTheme.syncSystemTheme()
onMounted(() => {
  systemAppearance = window.matchMedia?.("(prefers-color-scheme: dark)")
  systemAppearance?.addEventListener("change", syncSystemAppearance)
  syncSystemAppearance()
})
onBeforeUnmount(() => systemAppearance?.removeEventListener("change", syncSystemAppearance))
const route = useRoute()

const layouts = {
  default: DefaultLayout,
  auth: AuthLayout,
  ui: UserInterfaceLayout,
}

const currentLayout = computed(() => {
  const layoutName = route.meta.layout
  return layouts[layoutName] || DefaultLayout
})
</script>

<style lang="scss">
@use "@/styles/app";
</style>
