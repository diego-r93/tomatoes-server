<template>
  <v-container class="py-6 px-2" fluid>
    <v-card class="mt-4 mx-auto" color="#121212" max-width="400" variant="flat">
      <template v-slot:title>
        <v-icon color="#bdbdbd" icon="mdi-lan" size="x-large"></v-icon>
        <span class="ml-4 text-h5" style="color: #bdbdbd">
          MDD Configuration
        </span>
      </template>
    </v-card>   
  </v-container>
</template>

<script setup>
</script>

<style scoped>
.scroll-container {
  height: 500px;
  overflow-y: auto;
  overflow-x: hidden;
}

.scroll-container::-webkit-scrollbar {
  width: 3px;
}

.scroll-container::-webkit-scrollbar-thumb {
  background-color: #bdbdbd;
  border-radius: 4px;
}

.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
</style>