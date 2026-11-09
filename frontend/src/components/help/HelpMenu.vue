<template>
  <v-container fluid class="help-page app-page">
    <AppPageHeader :title="t('help')" icon="mdi-help-circle-outline"/>
    <div class="help-content">
      <header class="help-heading">
        <p class="help-eyebrow">{{ t('GROW WITH CONFIDENCE') }}</p>
        <h1 class="app-page-title">{{ productLabel }}</h1>
        <p class="help-intro">{{ t('Your workspace for connected hydroponics. Monitor your growing environment, manage pump schedules and keep your ESP32 boards connected.') }}</p>
      </header>
      <h2 class="app-section-title mb-4">{{ t('Useful resources') }}</h2>
      <v-row :gap="16">
        <v-col v-for="resource in helpResources" :key="resource.id" cols="12" md="4">
          <v-card v-bind="resource.link" variant="outlined" class="resource-card pa-5" :aria-label="resource.external ? `${t(resource.id)} (${t('newTab')})` : t(resource.id)">
            <v-icon :icon="resource.icon" color="secondary" size="26" class="mb-4" aria-hidden="true" />
            <h3 class="text-title-medium mb-2">{{ t(resource.id) }}</h3>
            <p class="resource-description">{{ t(resource.description) }}</p>
            <span class="resource-action">{{ resource.external ? t('Open resource') : t('View guide') }}<v-icon :icon="resource.external ? 'mdi-open-in-new' : 'mdi-arrow-right'" size="16" aria-hidden="true" /></span>
          </v-card>
        </v-col>
      </v-row>
      <section id="esp32" class="firmware-guide" aria-labelledby="esp32-heading">
        <div class="guide-heading"><v-icon icon="mdi-chip" color="secondary" aria-hidden="true" /><h2 id="esp32-heading" class="app-section-title ma-0">{{ t('firmware') }}</h2></div>
        <p>{{ t('Your ESP32 boards connect the growing system to Tomatoes. Start with the connected device list to find a board and access its information and firmware upload screen.') }}</p>
        <ol class="guide-steps">
          <li><strong>{{ t('Find the board.') }}</strong> {{ t('Open Devices and check its hostname, IP address and connection details.') }}</li>
          <li><strong>{{ t('Confirm the target.') }}</strong> {{ t('Use the information action to identify the board before making changes.') }}</li>
          <li><strong>{{ t('Update when needed.') }}</strong> {{ t('Open the upload action and use a firmware or filesystem file built for that exact board. The server and ESP32 firmware are separate parts of the project.') }}</li>
        </ol>
        <v-btn to="/device" variant="tonal" color="secondary" prepend-icon="mdi-chip">{{ t('Open devices') }}</v-btn>
      </section>
      <v-alert variant="tonal" color="secondary" icon="mdi-sprout-outline" class="mt-6">
        <strong>{{ t('Every growing system is different.') }}</strong> {{ t('Adjust pump schedules for your crop and setup, and check water circulation and nutrient conditions regularly. The hydroponics guide is a starting point for learning.') }}
      </v-alert>
    </div>
  </v-container>
</template>

<script setup>
import { useLanguage } from '@/composables/useLanguage';
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';
import { helpResources, productLabel } from './helpResources';

const { t } = useLanguage();
</script>

<style scoped lang="scss">
.help-content { max-width: 1040px; margin: 0 auto; }
.help-heading { margin: 8px 0 32px; }
.help-eyebrow { color: rgb(var(--v-theme-secondary)); font-size: 11px; letter-spacing: .12em; margin: 0 0 10px; }
.help-intro { max-width: 700px; color: rgb(var(--v-theme-muted)); line-height: 1.7; margin: 12px 0 0; }
.resource-card { display: flex; flex-direction: column; height: 100%; border-color: rgb(var(--v-theme-border)); background: rgb(var(--v-theme-surface)); border-radius: 6px; }
.resource-description { color: rgb(var(--v-theme-muted)); line-height: 1.6; margin: 0; flex: 1; }
.resource-action { display: flex; align-items: center; gap: 8px; margin-top: 24px; color: rgb(var(--v-theme-secondary)); font-size: 13px; }
.firmware-guide { margin-top: 32px; padding-top: 24px; border-top: 1px solid rgb(var(--v-theme-border)); scroll-margin-top: 88px; }
.guide-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.firmware-guide > p, .guide-steps { color: rgb(var(--v-theme-muted)); line-height: 1.7; }
.firmware-guide > p { margin: 0; }
.guide-steps { padding-left: 22px; margin: 16px 0 24px; }
.guide-steps li + li { margin-top: 10px; }
.guide-steps strong { color: rgb(var(--v-theme-on-surface)); font-weight: 500; }
</style>
