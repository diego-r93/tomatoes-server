<template>
  <div>
    <v-btn v-if="actor?.isAdmin" to="/users/users" variant="text" prepend-icon="mdi-arrow-left" class="mb-4">All users</v-btn>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ error }}</v-alert>
    <v-alert v-if="notice" type="success" variant="tonal" class="mb-4">{{ notice }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate />
    <template v-if="user && actor">
      <div class="profile-heading"><v-avatar color="primary" size="52">{{ initials(user) }}</v-avatar><div><h2>{{ fullName(user) }}</h2><p>{{ user.username }} · {{ user.email }}</p></div><v-chip :color="user.isAdmin ? 'primary' : undefined" variant="outlined">{{ userRoleLabel(user) }}</v-chip><v-chip :color="user.enabled ? 'success' : undefined" variant="tonal">{{ user.enabled ? 'Active' : 'Disabled' }}</v-chip></div>
      <v-alert v-if="user.isBuiltin" variant="tonal" color="secondary" class="mb-5">The built-in administrator is a system account. Its profile and credentials are read-only; it cannot be deleted or disabled.</v-alert>
      <v-card variant="outlined" class="profile-section" title="User information"><v-card-text>
        <v-form v-if="!user.isBuiltin" @submit.prevent="saveProfile"><div class="profile-fields">
          <v-text-field v-model="draft.firstName" label="First name" maxlength="80" :disabled="busy" />
          <v-text-field v-model="draft.lastName" label="Last name" maxlength="80" :disabled="busy" />
          <v-text-field v-model="draft.email" label="Email" :rules="[validEmail]" maxlength="254" :disabled="busy" />
          <v-text-field v-model="draft.username" label="Username" :rules="[required]" :readonly="user.isBuiltin" maxlength="50" :disabled="busy" />
          <v-text-field v-model="draft.phone" label="Phone" maxlength="40" :disabled="busy" />
          <v-text-field v-model="draft.state" label="Location" maxlength="100" :disabled="busy" />
        </div><div class="profile-actions"><v-btn type="submit" color="primary" :loading="busy" :disabled="busy">Save profile</v-btn><v-btn v-if="actor.isAdmin && !user.isBuiltin" :disabled="busy" @click="confirm = user.enabled ? 'disable' : 'enable'">{{ user.enabled ? 'Disable user' : 'Enable user' }}</v-btn><v-btn v-if="actor.isAdmin && !user.isBuiltin" color="error" variant="text" :disabled="busy" @click="confirm = 'delete'">Delete user</v-btn></div></v-form>
        <dl v-if="user.isBuiltin" class="account-facts"><div v-for="field in builtinFields" :key="field.key"><dt>{{ field.label }}</dt><dd>{{ user[field.key] || '—' }}</dd></div></dl>
        <dl class="account-facts"><div><dt>Created</dt><dd>{{ dateTime(user.createdAt) }}</dd></div><div><dt>Last sign-in</dt><dd>{{ dateTime(user.lastLoginAt) }}</dd></div><div><dt>Last sign-in IP</dt><dd>{{ user.lastLoginIp || '—' }}</dd></div><div><dt>Browser / OS</dt><dd>{{ user.browser }} / {{ user.os }}</dd></div></dl>
      </v-card-text></v-card>
      <v-card variant="outlined" class="profile-section" title="Groups"><v-card-text><template v-if="actor.isAdmin && !user.isBuiltin"><v-select v-model="groupIds" :items="availableGroups" item-title="name" item-value="id" label="Group membership" multiple chips :disabled="busy" /><v-btn color="primary" :loading="busy" :disabled="busy" @click="saveMembership">Save membership</v-btn></template><template v-else><v-chip v-for="group in user.groups" :key="group.id" class="mr-2" variant="outlined">{{ group.name }}</v-chip><p v-if="!user.groups.length">No groups assigned.</p></template><p class="profile-note">Groups organize users. Operational permissions will be configured in a future version.</p></v-card-text></v-card>
      <v-card v-if="!user.isBuiltin" variant="outlined" class="profile-section" title="Password"><v-card-text><v-form v-if="user.id === actor.id" @submit.prevent="changePassword"><v-text-field v-model="password.oldPassword" label="Current password" type="password" autocomplete="current-password" :rules="[required]" :disabled="busy" /><v-text-field v-model="password.newPassword" label="New password" type="password" autocomplete="new-password" :rules="[passwordRule]" :disabled="busy" /><v-btn type="submit" color="primary" :loading="busy" :disabled="busy">Change password</v-btn></v-form><v-btn v-if="actor.isAdmin" class="mt-3" variant="outlined" :disabled="busy || !emailConfiguration.configured || !user.enabled" @click="confirm = 'reset'">Send password reset email</v-btn></v-card-text></v-card>
      <v-card variant="outlined" class="profile-section" title="Sessions"><v-card-text><p class="profile-note">Active sessions, most recent first. Last seen updates while the app is open.</p><v-table class="session-table"><thead><tr><th>Last seen</th><th>Signed in</th><th>IP address</th><th>Browser / OS</th><th>Action</th></tr></thead><tbody><tr v-for="session in sessions" :key="session.id"><td>{{ dateTime(session.lastSeenAt) }}<v-chip v-if="session.current" size="x-small" color="primary" class="ml-2">Current</v-chip></td><td>{{ dateTime(session.createdAt) }}</td><td>{{ session.lastIp }}<small v-if="session.lastIp !== session.loginIp" class="d-block">Login: {{ session.loginIp }}</small></td><td>{{ session.browser }} / {{ session.os }}</td><td><v-btn size="small" variant="text" :disabled="busy" @click="sessionTarget = session.id; confirm = 'session'">Force logout</v-btn></td></tr><tr v-if="!sessions.length"><td colspan="5">No active sessions.</td></tr></tbody></v-table><v-btn v-if="sessions.length" class="mt-4" variant="outlined" :disabled="busy" @click="sessionTarget = null; confirm = 'sessions'">Force logout from all devices</v-btn></v-card-text></v-card>
      <UserActivityHistory :user-id="user.id" :refresh-key="historyRevision"/>
    </template>
    <v-dialog :model-value="Boolean(confirm)" max-width="460" persistent><v-card :title="confirmationTitle"><v-card-text>{{ confirmationText }}<v-alert v-if="dialogError" type="error" variant="tonal" class="mt-3">{{ dialogError }}</v-alert></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="busy" @click="confirm = ''; dialogError = ''">Cancel</v-btn><v-btn :color="confirm === 'delete' ? 'error' : 'primary'" :loading="busy" :disabled="busy" @click="execute">Confirm</v-btn></v-card-actions></v-card></v-dialog>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import userService from '@/services/userService';
import UserActivityHistory from './UserActivityHistory.vue';
import Authentication from '@/services/auth';
import { dateTime, fullName, initials, required, userError, userRoleLabel, validEmail } from '@/composables/userManagementUtils';
import type { ActiveSession, PasswordFields, UserGroup, UserProfileFields, UserRecord } from '@/services/userTypes';
import type { SubmitEventPromise } from 'vuetify';
import { useUserManagement } from './userManagementContext';

type ProfileAction = 'disable' | 'enable' | 'delete' | 'reset' | 'session' | 'sessions';

const { actor, emailConfiguration, loadIdentity } = useUserManagement();
const route = useRoute(), router = useRouter(), user = ref<UserRecord | null>(null), sessions = ref<ActiveSession[]>([]), historyRevision = ref(0), groups = ref<UserGroup[]>([]), groupIds = ref<number[]>([]);
const loading = ref(false), busy = ref(false), error = ref(''), notice = ref(''), confirm = ref<ProfileAction | ''>(''), dialogError = ref(''), sessionTarget = ref<string | null>(null);
const builtinFields = [{ key: 'firstName', label: 'First name' }, { key: 'lastName', label: 'Last name' }, { key: 'email', label: 'Email' }, { key: 'username', label: 'Username' }, { key: 'phone', label: 'Phone' }, { key: 'state', label: 'Location' }] as const;
const draft = reactive<UserProfileFields>({ firstName: '', lastName: '', email: '', username: '', phone: '', state: '' });
const password = reactive<PasswordFields>({ oldPassword: '', newPassword: '' });
const passwordRule = (value: string | null | undefined) => (typeof value === 'string' && value.length >= 8 && new TextEncoder().encode(value).length <= 72) || 'Use at least 8 characters and no more than 72 bytes.';
const availableGroups = computed(() => groups.value.filter(group => !group.isBuiltin));
const confirmationTitle = computed(() => confirm.value ? ({ disable: 'Disable user?', enable: 'Enable user?', delete: 'Delete user?', reset: 'Send reset email?', session: 'Force logout?', sessions: 'Force logout from all devices?' }[confirm.value]) : 'Confirm action');
const confirmationText = computed(() => confirm.value ? ({ disable: 'The user will be signed out and cannot sign in until enabled again.', enable: 'Allow this account to sign in again.', delete: 'Permanently delete this account and its group memberships.', reset: 'Send a one-time password reset link to the account email.', session: 'End the selected session. The current session will also sign out if selected.', sessions: 'End every active session for this account, including this one when applicable.' }[confirm.value]) : '')
async function load() {
  loading.value = true; error.value = '';
  try {
    const id = route.params.id;
    if (typeof id !== 'string') throw new Error('User not found.');
    const [profile, activeSessions, available] = await Promise.all([
      userService.get(id),
      userService.sessions(id),
      actor.value?.isAdmin ? userService.groups() : Promise.resolve({ data: [] }),
    ]);
    const record = profile.data;
    user.value = record;
    sessions.value = activeSessions.data;
    groups.value = available.data;
    historyRevision.value++;
    for (const { key } of builtinFields) draft[key] = record[key];
    groupIds.value = record.groups.filter(group => !group.isBuiltin).map(group => group.id);
  } catch (issue) { error.value = userError(issue); } finally { loading.value = false; }
}
async function run(work: () => Promise<unknown>, message: string) { if (busy.value) return; busy.value = true; error.value = ''; notice.value = ''; try { await work(); notice.value = message; await load(); } catch (issue) { error.value = userError(issue); } finally { busy.value = false; } }
async function saveProfile(event: SubmitEventPromise) {
  if (!(await event).valid || !user.value) return;
  const { id } = user.value;
  await run(async () => {
    await userService.update(id, draft);
    if (id === actor.value?.id) await loadIdentity();
  }, 'Profile saved.');
}
async function saveMembership() {
  if (!user.value) return;
  const { id } = user.value;
  await run(() => userService.membership(id, groupIds.value), 'Membership saved.');
}
async function changePassword(event: SubmitEventPromise) { if (!(await event).valid) return; await run(async () => { await userService.updatePassword(password); password.oldPassword = ''; password.newPassword = ''; }, 'Password changed. Other sessions were signed out.'); }
async function execute() {
  if (busy.value || !user.value || !confirm.value) return;
  const { id } = user.value;
  const action = confirm.value;
  const target = sessionTarget.value;
  if (action === 'session' && target === null) return;
  busy.value = true; dialogError.value = ''; notice.value = '';
  try {
    if (action === 'delete') { await userService.delete(id); await router.push('/users/users'); return; }
    if (action === 'disable' || action === 'enable') await userService.setEnabled(id, action === 'enable');
    if (action === 'reset') await userService.adminPasswordReset(id);
    if (action === 'session' || action === 'sessions') { const { data } = await userService.revokeSessions(id, action === 'session' ? target : null); if (data.revokedCurrent) { Authentication.logout({ notifyServer: false }); await router.push('/login'); return; } }
    confirm.value = ''; notice.value = action === 'reset' ? 'The email was submitted to the provider.' : 'Changes applied.'; await load();
  } catch (issue) { dialogError.value = userError(issue); } finally { busy.value = false; }
}
onMounted(load);
</script>
<style scoped lang="scss">
.session-table :deep(table){min-width:760px}.session-table :deep(td:nth-child(-n+2)){white-space:nowrap}.profile-heading { display:flex; align-items:center; gap:14px; margin-bottom:24px; flex-wrap:wrap; }.profile-heading h2 { font-size:22px; font-weight:500; }.profile-heading p,.profile-note { color:rgb(var(--v-theme-muted)); }.profile-section { margin-bottom:20px; border-color:rgb(var(--v-theme-border)); }.profile-fields { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 18px; }.profile-actions { display:flex; gap:10px; flex-wrap:wrap; }.account-facts { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; margin-top:24px; }.account-facts dt { color:rgb(var(--v-theme-muted)); font-size:12px; }.account-facts dd { margin-top:4px; overflow-wrap:anywhere; }.profile-note { font-size:13px; margin:8px 0 16px; }@media(max-width:600px) { .profile-fields,.account-facts { grid-template-columns:1fr; } }
</style>
