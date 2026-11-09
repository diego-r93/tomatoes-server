<template>
  <v-app-bar color="background" flat :height="height" class="app-page-header">
    <slot>
      <div class="app-header-row">
        <div class="app-header-title"><v-icon v-if="icon" :icon="icon" size="19" aria-hidden="true"/><span>{{ title }}</span></div>
        <div v-if="$slots.actions" class="app-header-actions"><slot name="actions"/></div>
      </div>
    </slot>
  </v-app-bar>
</template>

<script setup lang="ts">
defineProps({ title: { type: String, default: '' }, icon: { type: String, default: '' }, height: { type: Number, default: 56 } });
</script>

<style scoped lang="scss">
.app-header-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 16px;width:100%;min-width:0}
.app-header-title{display:flex;align-items:center;gap:10px;min-width:0;color:rgb(var(--v-theme-on-surface));font-size:15px;font-weight:400}
.app-header-title>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.app-header-title>.v-icon{flex-shrink:0}
.app-header-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}
.app-header-row .app-header-actions :deep(.v-btn--icon){width:34px;min-width:34px;height:32px;border-radius:3px}
.app-header-actions :deep(.v-icon){font-size:18px}
@media(max-width:600px){.app-header-row{padding-inline:12px;gap:8px}.app-header-title{font-size:14px;gap:8px}.app-header-actions{gap:4px}}
</style>
