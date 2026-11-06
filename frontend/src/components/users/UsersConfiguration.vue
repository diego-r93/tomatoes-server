<template>
  <v-container fluid class="users-page app-page">
    <AppPageHeader :title="actor?.isAdmin ? 'Administration / Users' : 'My account'" icon="mdi-account-group-outline"/>
    <header class="users-heading app-page-heading"><div><h1 class="app-page-title">{{ actor?.isAdmin ? 'Users & access' : 'My account' }}</h1><p>{{ actor?.isAdmin ? 'Manage people, groups and invitations.' : 'Manage your profile and active sessions.' }}</p></div><v-btn v-if="actor?.isAdmin" color="primary" prepend-icon="mdi-email-plus-outline" :disabled="!emailConfiguration.configured" @click="openInvite">Invite user</v-btn></header>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}<template #append><v-btn @click="loadIdentity">Retry</v-btn></template></v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />
    <template v-if="actor">
      <v-alert v-if="actor.isAdmin && !emailConfiguration.configured" color="secondary" variant="tonal" icon="mdi-email-off-outline" class="mb-5">Email delivery is not configured yet. You can manage users and groups; invitations and email resets become available after setup.</v-alert>
      <v-tabs v-if="actor.isAdmin" color="primary" class="mb-5" aria-label="User administration">
        <v-tab to="/users/users">Users</v-tab><v-tab to="/users/groups">Groups</v-tab><v-tab to="/users/invitations">Invitations</v-tab>
      </v-tabs>
      <router-view :key="route.path" />
      <InviteUserDialog v-if="actor.isAdmin" v-model="inviteOpen" :default-days="emailConfiguration.defaultInvitationDays" @created="invitationCreated" />
    </template>
  </v-container>
</template>
<script setup>
import AppPageHeader from '@/components/navigation/AppPageHeader.vue';
import { onMounted, provide, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Authentication from '@/services/auth';
import userService from '@/services/userService';
import { userError } from '@/composables/userManagementUtils';
import InviteUserDialog from './InviteUserDialog.vue';
const route = useRoute(), router = useRouter();
const actor = ref(null), loading = ref(false), error = ref(''), inviteOpen = ref(false);
const emailConfiguration = ref({ configured: false, defaultInvitationDays: 7 });
function openInvite() { if (emailConfiguration.value.configured) inviteOpen.value = true; }
async function loadIdentity() {
  loading.value = true; error.value = '';
  try {
    actor.value = await Authentication.validateSession(true);
    if (!actor.value) return;
    if (actor.value.isAdmin) emailConfiguration.value = (await userService.settings()).data;
    else if (!route.path.startsWith(`/users/users/${actor.value.id}`)) await router.replace(`/users/users/${actor.value.id}`);
  } catch (issue) { error.value = userError(issue); }
  finally { loading.value = false; }
}
function invitationCreated() { if (route.path === '/users/invitations') refreshInvitations.value++; else router.push('/users/invitations'); }
const refreshInvitations = ref(0);
provide('userManagement', { actor, emailConfiguration, openInvite, loadIdentity, refreshInvitations });
onMounted(loadIdentity);
</script>
<style scoped lang="scss">

.users-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
.users-heading p { color: rgb(var(--v-theme-muted)); margin: 6px 0 0; }
@media (max-width: 600px) { .users-page { padding: 16px; } }
</style>
