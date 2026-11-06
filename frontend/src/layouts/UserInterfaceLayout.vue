<template>
  <navigation-drawer />
  <v-main>
    <slot />
  </v-main>
</template>

<script setup>
import NavigationDrawer from '@/components/navigation/NavigationDrawer.vue'
</script>
