<template>
  <navigation-drawer />
  <v-main>
    <slot />
  </v-main>
</template>

<script setup lang="ts">
import NavigationDrawer from '@/components/navigation/NavigationDrawer.vue'
</script>
