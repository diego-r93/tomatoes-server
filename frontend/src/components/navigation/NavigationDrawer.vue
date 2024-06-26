<template>
  <v-navigation-drawer v-model="drawer" :rail="rail">
    <v-list-item prepend-avatar="@/assets/images/hydroponic.png" title="Home" value="home" href="/" nav></v-list-item>

    <v-list density="compact" nav>
      <v-tooltip v-for="item in items" :key="item.value">
        <template v-slot:activator="{ props }">
          <v-list-item v-bind="props" :key="item.value" :prepend-icon="item.icon" :title="item.title" :value="item.value"
            :to="item.path" @click="selectItem(item.value)"></v-list-item>
        </template>
        <span>{{ item.title }}</span>
      </v-tooltip>
    </v-list>

    <template v-slot:append>
      <v-menu open-on-hover location="right">
        <template v-slot:activator="{ props }">
          <v-list-item prepend-icon="mdi-help-circle-outline" title="Help" value="help" to="/help" v-bind="props">
          </v-list-item>
        </template>        
        <v-list>
          <v-list-item v-for="(item, index) in itemsHelp" :key="index">
            <a :href="item.url" target="_blank">
              <v-btn :prepend-icon=item.icon> {{ item.title }}
              </v-btn>
            </a>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-tooltip text="Logout">
        <template v-slot:activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi mdi-logout" title="Logout" value="logout" @click.stop="logoutUser"></v-list-item>
        </template>
      </v-tooltip>
    </template>
  </v-navigation-drawer>
</template>

<script setup>
import { ref } from 'vue';
import router from '@/router';
import Authentication from '@/services/auth';

// Define os estados reativos com `ref`
const drawer = ref(true);
const rail = ref(true);
const selectedItem = ref('dashboard');
const items = ref([
  { title: 'DashBoards', icon: 'mdi-view-dashboard', value: "dashboards", path: '/dashboard' },
  { title: 'Device configuration', icon: 'mdi-chip', value: "device", path: '/device' },
  { title: 'Database configuration', icon: 'mdi-database', value: "database", path: '/database' },
  { title: 'Alerting', icon: 'mdi-bell', value: "alerting", path: '/alerting' },
  { title: 'Boards MDD Configuration', icon: 'mdi mdi-lan', value: "mdd", path: '/mdd' },
  { title: 'Users', icon: 'mdi-account', value: "users", path: '/users' },
  { title: 'Configuration', icon: 'mdi-cog', value: "configuration", path: '/configuration' },
]);

const itemsHelp = ref([
  { title: 'Vue.js', icon: 'mdi-open-in-new', url: 'https://vuejs.org/' },
  { title: 'Vuetify', icon: 'mdi-open-in-new', url: 'https://vuetifyjs.com/' },
  { title: 'Node.js', icon: 'mdi-open-in-new', url: 'https://nodejs.org/' },
  { title: 'Express.js', icon: 'mdi-open-in-new', url: 'https://expressjs.com/' },
  { title: 'MongoDB', icon: 'mdi-open-in-new', url: 'https://www.mongodb.com/' },
  { title: 'Documentation', icon: 'mdi-open-in-new', url: 'https://github.com/diego-r93/tomatoes-server' },
]);

// Define os métodos
function selectItem(itemValue) {
  selectedItem.value = itemValue;
}

function logoutUser() {
  Authentication.logout();
  router.push('/login');
}
</script>

<style></style>