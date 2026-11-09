<template>
  <span class="board-connection" :class="`board-connection--${connection.state}`" tabindex="0" role="img" :aria-label="`Board ${connection.host}: ${connection.label}. ${connection.detail}`">
    <i aria-hidden="true"/><span>{{ connection.label }}</span>
    <v-tooltip activator="parent" location="bottom" max-width="340">{{ connection.detail }}</v-tooltip>
  </span>
</template>
<script setup lang="ts">
export interface BoardConnection {
  host: string;
  state: 'online' | 'unseen' | 'unknown';
  label: string;
  detail: string;
}
defineProps<{ connection: BoardConnection }>();
</script>
<style scoped lang="scss">
.board-connection{display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:3px;font-size:11px;line-height:1.5;font-weight:400;color:rgb(var(--v-theme-muted));background:rgba(var(--v-theme-muted),.1);white-space:nowrap;vertical-align:middle;cursor:help}.board-connection i{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0}.board-connection--online{color:rgb(var(--v-theme-success));background:rgba(var(--v-theme-success),.1)}.board-connection:focus-visible{outline:2px solid rgb(var(--v-theme-primary));outline-offset:2px}
</style>
