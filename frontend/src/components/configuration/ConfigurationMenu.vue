<template>
  <v-container fluid :lang="language" class="configuration-page app-page">
    <AppPageHeader :title="t('configuration')" icon="mdi-cog-outline"/>
    <div class="configuration-content">
      <header class="configuration-heading"><h1 class="app-page-title">{{ t('welcome') }}</h1><p>{{ t('intro') }}</p></header>
      <v-card elevation="0" class="appearance-section custom-border">
        <div class="section-heading"><div><h2>{{ t('appearance') }}</h2><p>{{ t('palette') }}</p></div><v-chip size="small" color="primary" variant="tonal">{{ currentTheme.title }}</v-chip></div>
        <div class="theme-choices" role="group" :aria-label="t('chooseTheme')">
          <button v-for="option in themeCatalog" :key="option.value" type="button" class="theme-choice" :data-theme-choice="option.value" :aria-pressed="appearance.theme === option.value" @click="appearance.changeTheme(option.value)">
            <span class="theme-swatch" :class="`theme-swatch--${option.value}`" aria-hidden="true"><span class="swatch-sidebar" /><span class="swatch-content"><span class="swatch-title" /><span class="swatch-panels"><span /><span /></span><span class="swatch-action" /></span></span>
            <span class="theme-name">{{ option.title }}<v-icon v-if="appearance.theme === option.value" icon="mdi-check" size="16" aria-hidden="true" /></span>
            <span class="theme-description">{{ t(option.value) }}</span>
          </button>
        </div>
        <div class="preference-row"><div><h3>{{ t('followSystem') }}</h3><p>{{ t('followSystemHelp') }}</p></div><v-switch :model-value="appearance.followSystem" color="primary" hide-details :aria-label="t('followSystem')" @update:model-value="appearance.setFollowSystem" /></div>
      </v-card>
      <v-card elevation="0" class="appearance-section custom-border">
        <h2>{{ t('display') }}</h2>
        <div class="preference-row"><div><h3>{{ t('density') }}</h3><p>{{ t('densityHelp') }}</p></div><v-select :model-value="appearance.density" :items="densityOptions" variant="outlined" hide-details :aria-label="t('density')" @update:model-value="appearance.setDensity" /></div>
        <div class="preference-row"><div><h3>{{ t('sidebarLabels') }}</h3><p>{{ t('sidebarHelp') }}</p></div><v-switch :model-value="appearance.sidebarExpanded" color="primary" hide-details :aria-label="t('sidebarLabels')" @update:model-value="appearance.setSidebarExpanded" /></div>
        <div class="preference-row"><div><h3>{{ t('reduceMotion') }}</h3><p>{{ t('motionHelp') }}</p></div><v-switch :model-value="appearance.reduceMotion" color="primary" hide-details :aria-label="t('reduceMotion')" @update:model-value="appearance.setReduceMotion" /></div>
      </v-card>
      <v-card elevation="0" class="appearance-section custom-border">
        <h2>{{ t('language') }}</h2>
        <div class="preference-row">
          <p>{{ t('languageHelp') }}</p>
          <v-select :model-value="language" :items="languageOptions" variant="outlined" hide-details :aria-label="t('language')" @update:model-value="setLanguage" />
        </div>
        <p v-if="languageStorageUnavailable" role="status">{{ t('storageUnavailable') }}</p>
      </v-card>
      <HistoryRetention v-if="Authentication.currentUser?.isAdmin" />
      <footer class="preferences-footer"><p aria-live="polite">{{ currentTheme.title }} {{ t('applied') }} · {{ t(appearance.storageUnavailable ? 'storageUnavailable' : 'saved') }}</p><v-btn variant="outlined" @click="resetOpen = true">{{ t('reset') }}</v-btn></footer>
    </div>
    <v-dialog v-model="resetOpen" max-width="440">
      <v-card><v-card-title>{{ t('resetTitle') }}</v-card-title><v-card-text>{{ t('resetHelp') }}</v-card-text><v-card-actions><v-spacer /><v-btn @click="resetOpen = false">{{ t('cancel') }}</v-btn><v-btn color="primary" @click="resetAppearance">{{ t('reset') }}</v-btn></v-card-actions></v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';
import HistoryRetention from './HistoryRetention.vue';
import Authentication from '@/services/auth';
import { computed, ref } from 'vue';
import { useAppStore } from '@/store/appConfiguration';
import { themeCatalog } from '@/styles/themes';
import { languageOptions, useLanguage } from '@/composables/useLanguage';
const appearance = useAppStore();
const { language, languageStorageUnavailable, setLanguage, t } = useLanguage();
const currentTheme = computed(() => themeCatalog.find(option => option.value === appearance.theme) || themeCatalog[0]);
const densityOptions = computed(() => ['comfortable', 'compact'].map(value => ({ title: t(value), value })));
const resetOpen = ref(false);
function resetAppearance() { appearance.resetAppearance(); resetOpen.value = false; }
</script>

<style scoped lang="scss">

.configuration-content { max-width: 1040px; margin: 0 auto; }
.configuration-heading { margin-bottom: 24px; p { margin-top: 5px; } }
p { margin: 0; }
h2, h3 { margin: 0; }
p, .theme-description { color: rgb(var(--v-theme-muted)); }
.appearance-section { padding: var(--app-panel-padding, 22px); margin-top: 18px; border-radius: 6px; }
h2 { font-size: 16px; font-weight: 500; } h3 { font-size: 14px; font-weight: 500; }
.section-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; p { margin-top: 5px; } }
.theme-choices { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 22px 0; }
.theme-choice { background: transparent; color: inherit; min-width: 0; text-align: left; padding: 8px; border: 1px solid rgb(var(--v-theme-border)); border-radius: 5px; &[aria-pressed='true'] { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; } }
.theme-name { display: flex; align-items: center; justify-content: space-between; gap: 4px; font-size: 13px; font-weight: 500; margin-top: 9px; }
.theme-description { display: block; font-size: 12px; margin-top: 3px; }
.theme-swatch { display: flex; min-height: 95px; background: var(--swatch-background); border: 1px solid var(--swatch-border); border-radius: 3px; overflow: hidden; }
.swatch-sidebar { width: 14%; background: var(--swatch-sidebar); border-right: 1px solid var(--swatch-border); }
.swatch-content { display: flex; flex-direction: column; flex: 1; gap: 9px; padding: 12px 9px; }
.swatch-title { height: 4px; width: 58%; background: var(--swatch-muted); opacity: .7; }
.swatch-panels { display: flex; flex: 1; gap: 5px; > span { flex: 1; background: var(--swatch-surface); border: 1px solid var(--swatch-border); border-radius: 2px; } }
.swatch-action { height: 5px; width: 35%; background: var(--swatch-primary); }
.preference-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: var(--app-row-padding, 12px) 0; border-top: 1px solid rgb(var(--v-theme-border)); margin-top: 12px; p { font-size: 12px; margin-top: 4px; } :deep(.v-switch) { flex: 0 0 auto; } :deep(.v-select) { flex: 0 0 165px; } }
.preferences-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin: 22px 0; p { font-size: 12px; } }
@media (max-width: 850px) { .theme-choices { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 500px) { .configuration-page { padding: 16px; }.appearance-section { padding: 16px; }.preference-row { gap: 12px; :deep(.v-select) { flex-basis: 130px; } }.theme-description { font-size: 11px; } }
</style>
