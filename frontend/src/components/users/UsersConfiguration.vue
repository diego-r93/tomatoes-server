<template>
  <v-container class="py-6 px-2" fluid>
    <v-card class="mt-4 mx-auto" color="#121212" max-width="400" variant="flat">
      <template v-slot:title>
        <v-icon color="#bdbdbd" icon="mdi-account" size="x-large"></v-icon>
        <span class="ml-4 text-h5" style="color: #bdbdbd">
          Users
        </span>
      </template>
    </v-card>

    <v-card class="mt-4 mx-auto" max-width="1400" flat>
      <v-tabs v-model="tab" bg-color="#121212" slider-color="teal-lighten-3" align-tabs="start">
        <v-tab v-for="item in items" :key="item.id" :to="item.route">
          <span style="color: #bdbdbd">
            {{ item.name }}
          </span>
        </v-tab>
      </v-tabs>
      <v-card class="custom-border" min-height="600">
        <router-view></router-view>
      </v-card>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const tab = ref(route.path);  // Inicia a tab com a rota atual

const items = [
  { id: 1, name: 'Users', route: '/users/users' },
  { id: 2, name: 'Teams', route: '/users/teams' },
];

const navigateTo = (route) => {
  router.push(route);
};

watch(() => route.path, (newPath) => {
  tab.value = newPath;
});
</script>