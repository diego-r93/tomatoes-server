<template>
  <v-app-bar color="#121212" flat>
    <template v-slot:prepend>
      <v-btn density="compact" icon="mdi-arrow-left" size="large" color="#bdbdbd" @click="goBack"></v-btn>
    </template>
    <v-app-bar-title class="text-h6">
      <span style="color: #bdbdbd">
        DashBoard / Home
      </span>
    </v-app-bar-title>
  </v-app-bar>

 
</template>

<script setup>
import router from '@/router'

const goBack = () => {
  router.go(-1);
}

</script>