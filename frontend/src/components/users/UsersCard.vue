<template>
  <div>
    <div class="users-tools"><v-text-field v-model="query" label="Search users" placeholder="Name, username or email" prepend-inner-icon="mdi-magnify" hide-details clearable variant="outlined" /><v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="load">Refresh</v-btn></div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-card variant="outlined" class="users-table-card">
      <v-table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Groups</th><th>Last sign-in</th><th>Actions</th></tr></thead><tbody>
        <tr v-for="user in filtered" :key="user.id"><td><router-link class="user-link" :to="`/users/users/${user.id}`"><v-avatar color="surface-variant" size="34">{{ initials(user) }}</v-avatar><span><strong>{{ fullName(user) }}</strong><v-icon v-if="user.isBuiltin" icon="mdi-lock-outline" size="14" class="ml-1" /><small>{{ user.username }} · {{ user.email }}</small></span></router-link></td><td><v-chip :color="user.isAdmin ? 'primary' : undefined" size="small" variant="outlined">{{ userRoleLabel(user) }}</v-chip></td><td><v-chip :color="user.enabled ? 'success' : undefined" size="small" variant="tonal">{{ user.enabled ? 'Active' : 'Disabled' }}</v-chip></td><td><div class="group-chips"><v-chip v-for="group in user.groups" :key="group.id" size="small" variant="outlined">{{ group.name }}</v-chip><span v-if="!user.groups.length" class="muted">No group</span></div></td><td class="last-sign-in">{{ dateTime(user.lastLoginAt) }}</td><td><v-btn variant="text" :to="`/users/users/${user.id}`">View</v-btn></td></tr>
        <tr v-if="!loading && !filtered.length"><td colspan="6" class="empty-users">{{ query ? 'No users match your search.' : 'No users found.' }}</td></tr>
      </tbody></v-table>
    </v-card>
    <p class="users-note"><v-icon icon="mdi-lock-outline" size="16" /> The built-in admin account cannot be deleted or disabled.</p>
  </div>
</template>
<script setup>
import { computed, inject, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import userService from '@/services/userService';
import { dateTime, fullName, initials, userError, userRoleLabel } from '@/composables/userManagementUtils';
const { actor } = inject('userManagement');
const router = useRouter(), users = ref([]), query = ref(''), loading = ref(false), error = ref('');
const filtered = computed(() => { const term = (query.value || '').toLowerCase(); return users.value.filter(user => `${fullName(user)} ${user.username} ${user.email}`.toLowerCase().includes(term)); });
async function load() {
  if (!actor.value.isAdmin) { router.replace(`/users/users/${actor.value.id}`); return; }
  loading.value = true; error.value = '';
  try { users.value = (await userService.getAll()).data; } catch (issue) { error.value = userError(issue); }
  finally { loading.value = false; }
}
onMounted(load);
</script>
<style scoped lang="scss">
.users-tools { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }.users-tools :deep(.v-text-field) { max-width: 440px; }
.users-table-card { border-color: rgb(var(--v-theme-border)); }.user-link { display: flex; gap: 12px; align-items: center; color: rgb(var(--v-theme-on-surface)); text-decoration: none; padding: 12px 0; }.user-link strong { font-weight: 500; }.user-link small { display: block; color: rgb(var(--v-theme-muted)); overflow-wrap: anywhere; }.user-link:hover strong { text-decoration: underline; }
.group-chips { display: flex; gap: 4px; flex-wrap: wrap; padding: 6px 0; }.last-sign-in { font-size: 13px; white-space: nowrap; }.muted,.users-note { color: rgb(var(--v-theme-muted)); }.users-note { font-size: 12px; margin: 14px 0 0; }.empty-users { padding: 30px !important; text-align: center; }
@media(max-width:700px) { .users-table-card :deep(thead) { display: none; }.users-table-card :deep(table),.users-table-card :deep(tbody) { display: block; }.users-table-card :deep(tr) { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 14px; border-bottom: 1px solid rgb(var(--v-theme-border)); }.users-table-card :deep(td) { display: block; height: auto !important; padding: 0 !important; border: 0 !important; }.users-table-card :deep(td:first-child) { width: 100%; }.users-table-card :deep(td:last-child) { margin-left: auto; }.user-link { padding: 0; } }
@media (max-width: 450px) {
  .users-tools { align-items: stretch; flex-direction: column; gap: 8px; }
  .users-tools > .v-btn { align-self: flex-end; }
}
</style>
