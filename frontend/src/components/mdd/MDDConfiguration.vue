<template>
  <AppPageHeader title="Boards MDD" icon="mdi-lan"/>
  <v-container class="mdd-page">
    <section class="mdd-placeholder">
      <v-icon icon="mdi-lan" size="48" color="muted"/>
      <v-chip variant="tonal" color="primary" size="small">Coming soon</v-chip>
      <h1>Boards MDD</h1>
      <p>This workspace is reserved for future MDD board support. Configuration and device controls are not available yet.</p>
      <div><v-btn to="/device" variant="outlined" prepend-icon="mdi-chip">View devices</v-btn><v-btn to="/dashboard" variant="text" prepend-icon="mdi-view-dashboard">Dashboards</v-btn></div>
    </section>
  </v-container>
</template>
<script setup>
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';
</script>
<style scoped lang="scss">
.mdd-page{max-width:1440px;padding:48px 24px}.mdd-placeholder{max-width:560px;margin:32px auto;text-align:center;display:flex;align-items:center;flex-direction:column;gap:18px}.mdd-placeholder h1{font-size:26px;font-weight:500}.mdd-placeholder p{color:rgb(var(--v-theme-muted));line-height:1.7}.mdd-placeholder>div{display:flex;justify-content:center;flex-wrap:wrap;gap:10px}
</style>
