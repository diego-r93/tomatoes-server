<template>
  <v-navigation-drawer v-model="drawer" :rail="!appearance.sidebarExpanded" color="sidebar">
    <v-list density="compact" nav class="sidebar-brand">
      <v-list-item title="Home" value="home" to="/" nav class="brand-home" aria-label="Home"><template #prepend><v-icon aria-hidden="true"><img :src="homeLogo" class="brand-logo" alt="" width="24" height="24" draggable="false"/></v-icon></template></v-list-item>
    </v-list>

    <v-list density="compact" nav>
      <v-tooltip v-for="item in items" :key="item.value">
        <template v-slot:activator="{ props }">
          <v-list-item v-bind="props" :key="item.value" :prepend-icon="item.icon" :title="item.title" :value="item.value"
            :to="item.path" :subtitle="appearance.sidebarExpanded ? item.subtitle : undefined" @click="selectItem(item.value)"></v-list-item>
        </template>
        <span>{{ item.title }}{{ item.subtitle ? ` · ${item.subtitle}` : '' }}</span>
      </v-tooltip>
    </v-list>

    <template v-slot:append>
      <v-menu open-on-hover open-on-click location="right" :offset="8" :open-delay="120" :close-delay="140" min-width="260" max-width="320">
        <template v-slot:activator="{ props }">
          <v-list-item prepend-icon="mdi-help-circle-outline" title="Help" value="help" to="/help" aria-label="Help" v-bind="props">
          </v-list-item>
        </template>
        <v-list class="help-resources py-1" density="compact" aria-label="Help resources">
          <div class="help-version"><v-icon icon="mdi-sprout" size="16" aria-hidden="true" /><span>{{ productLabel }}</span></div>
          <v-divider class="mb-1" />
          <v-list-item v-for="item in helpResources" :key="item.id" v-bind="item.link" :prepend-icon="item.icon" :title="item.title" class="help-resource" :aria-label="item.external ? `${item.title} (opens in a new tab)` : item.title">
            <template #append><v-icon :icon="item.external ? 'mdi-open-in-new' : 'mdi-arrow-right'" size="15" color="muted" aria-hidden="true" /></template>
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
import homeLogo from '@/assets/images/hydroponic.png';
import router from '@/router';
import Authentication from '@/services/auth';
import { useAppStore } from '@/store/appConfiguration';
import { helpResources, productLabel } from '@/components/help/helpResources';

// Define os estados reativos com `ref`
const drawer = ref(true);
const appearance = useAppStore();
const selectedItem = ref('dashboard');
const items = ref([
  { title: 'Dashboards', icon: 'mdi-view-dashboard', value: "dashboards", path: '/dashboard' },
  { title: 'Devices', icon: 'mdi-chip', value: "device", path: '/device' },
  { title: 'Database', icon: 'mdi-database', value: "database", path: '/database' },
  { title: 'Alerting', icon: 'mdi-bell', value: "alerting", path: '/alerting' },
  { title: 'Boards MDD', subtitle: 'Coming soon', icon: 'mdi mdi-lan', value: "mdd", path: '/mdd' },
  { title: 'Users', icon: 'mdi-account', value: "users", path: '/users' },
  { title: 'Configuration', icon: 'mdi-cog', value: "configuration", path: '/configuration' },
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

<style scoped lang="scss">
.sidebar-brand{height:56px;display:flex;align-items:center;padding-block:0}.brand-home{width:100%;margin:0}.brand-home :deep(.v-list-item__prepend .v-icon){opacity:1}.brand-logo{display:block;width:24px;height:24px;object-fit:contain}
.help-resources { border: 1px solid rgb(var(--v-theme-border)); border-radius: 6px; background: rgb(var(--v-theme-surface)); }
.help-version { display: flex; align-items: center; gap: 8px; padding: 12px 16px; color: rgb(var(--v-theme-muted)); font-size: 12px; }
.help-resource { margin: 2px 4px; border-radius: 4px; }
.help-resource :deep(.v-list-item__prepend > .v-icon) { margin-inline-end: 12px; opacity: .85; }
.help-resource :deep(.v-list-item-title) { font-size: 14px; }
</style>
