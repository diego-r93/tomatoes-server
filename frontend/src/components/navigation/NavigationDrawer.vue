<template>
  <v-navigation-drawer v-model="drawer" :lang="language" :rail="!appearance.sidebarExpanded" color="sidebar">
    <v-list density="compact" nav class="sidebar-brand">
      <v-list-item :title="t('home')" value="home" to="/" nav class="brand-home" :aria-label="t('home')"><template #prepend><v-icon aria-hidden="true"><img :src="homeLogo" class="brand-logo" alt="" width="24" height="24" draggable="false"/></v-icon></template></v-list-item>
    </v-list>

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
      <v-menu open-on-hover open-on-click location="right" :offset="8" :open-delay="120" :close-delay="140" min-width="260" max-width="320">
        <template v-slot:activator="{ props }">
          <v-list-item prepend-icon="mdi-help-circle-outline" :title="t('help')" value="help" to="/help" :aria-label="t('help')" v-bind="props">
          </v-list-item>
        </template>
        <v-list class="help-resources py-1" density="compact" :aria-label="t('helpResources')">
          <div class="help-version"><v-icon icon="mdi-sprout" size="16" aria-hidden="true" /><span>{{ productLabel }}</span></div>
          <v-divider class="mb-1" />
          <v-list-item v-for="item in helpResources" :key="item.id" v-bind="item.link" :prepend-icon="item.icon" :title="t(item.id)" class="help-resource" :aria-label="item.external ? `${t(item.id)} (${t('newTab')})` : t(item.id)">
            <template #append><v-icon :icon="item.external ? 'mdi-open-in-new' : 'mdi-arrow-right'" size="15" color="muted" aria-hidden="true" /></template>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-dialog
        v-model="logoutConfirmation"
        width="300"
        :scrim="false"
        location-strategy="connected"
        location="end bottom"
        origin="auto"
        scroll-strategy="reposition"
        :offset="10"
        content-class="logout-popover"
        aria-labelledby="logout-title"
        aria-describedby="logout-description"
      >
        <template #activator="{ props: dialogProps }">
          <v-tooltip :text="t('logout')">
            <template #activator="{ props: tooltipProps }">
              <v-list-item
                v-bind="mergeProps(tooltipProps, dialogProps)"
                prepend-icon="mdi mdi-logout"
                :title="t('logout')"
                :aria-label="t('logout')"
                role="button"
              />
            </template>
          </v-tooltip>
        </template>
        <v-card class="logout-card" variant="outlined">
          <v-card-title id="logout-title">
            <v-icon icon="mdi-logout" size="18" aria-hidden="true" />
            {{ t('logoutTitle') }}
          </v-card-title>
          <v-card-text id="logout-description">{{ t('logoutDescription') }}</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn size="small" @click="logoutConfirmation = false">{{ t('cancel') }}</v-btn>
            <v-btn color="primary" variant="flat" size="small" @click="logoutUser">{{ t('logout') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </template>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { computed, mergeProps, ref } from 'vue';
import { useLanguage } from '@/composables/useLanguage';
import homeLogo from '@/assets/images/hydroponic.png';
import router from '@/router';
import Authentication from '@/services/auth';
import { useAppStore } from '@/store/appConfiguration';
import { helpResources, productLabel } from '@/components/help/helpResources';

// Define os estados reativos com `ref`
const drawer = ref(true);
const logoutConfirmation = ref(false);
const appearance = useAppStore();
const { language, t } = useLanguage();
const selectedItem = ref('dashboard');
const items = computed(() => [
  { title: t('dashboards'), icon: 'mdi-view-dashboard', value: "dashboards", path: '/dashboard' },
  { title: t('device'), icon: 'mdi-chip', value: "device", path: '/device' },
  { title: t('database'), icon: 'mdi-database', value: "database", path: '/database' },
  { title: t('alerting'), icon: 'mdi-bell', value: "alerting", path: '/alerting' },
  ...(Authentication.currentUser?.isAdmin ? [{ title: t('Board setup'), icon: 'mdi-tune-variant', value: 'board-setup', path: '/board-setup' }] : []),
  { title: t('users'), icon: 'mdi-account', value: "users", path: '/users' },
  { title: t('configuration'), icon: 'mdi-cog', value: "configuration", path: '/configuration' },
]);

// Define os métodos
function selectItem(itemValue: string) {
  selectedItem.value = itemValue;
}

async function logoutUser() {
  logoutConfirmation.value = false;
  if (!await router.replace('/login')) Authentication.logout();
}
</script>

<style scoped lang="scss">
.sidebar-brand{height:56px;display:flex;align-items:center;padding-block:0}.brand-home{width:100%;margin:0}.brand-home :deep(.v-list-item__prepend .v-icon){opacity:1}.brand-logo{display:block;width:24px;height:24px;object-fit:contain}
.help-resources { border: 1px solid rgb(var(--v-theme-border)); border-radius: 6px; background: rgb(var(--v-theme-surface)); }
.help-version { display: flex; align-items: center; gap: 8px; padding: 12px 16px; color: rgb(var(--v-theme-muted)); font-size: 12px; }
.help-resource { margin: 2px 4px; border-radius: 4px; }
.help-resource :deep(.v-list-item__prepend > .v-icon) { margin-inline-end: 12px; opacity: .85; }
.help-resource :deep(.v-list-item-title) { font-size: 14px; }

:global(.v-dialog > .logout-popover) { margin: 0; }
.logout-card { border-color: rgb(var(--v-theme-border)); }
.logout-card #logout-title { display: flex; gap: 8px; align-items: center; padding: 12px 14px 4px; font-size: 15px; }
.logout-card #logout-description { padding: 4px 14px 10px; color: rgb(var(--v-theme-muted)); font-size: 13px; }
.logout-card .v-card-actions { min-height: 0; padding: 4px 14px 12px; }
</style>
