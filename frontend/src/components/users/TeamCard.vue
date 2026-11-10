<template>
  <div>
    <div class="group-toolbar"><p>{{ t('Organize people by responsibility. Group permissions are a future step.') }}</p><v-btn color="primary" prepend-icon="mdi-plus" @click="edit()">{{ t('New group') }}</v-btn></div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ t(error) }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-card variant="outlined" class="groups-card"><v-table><thead><tr><th>{{ t('Group') }}</th><th>{{ t('Members') }}</th><th>{{ t('Description') }}</th><th>{{ t('Actions') }}</th></tr></thead><tbody><tr v-for="group in groups" :key="group.id"><td><strong>{{ group.name }}</strong><v-icon v-if="group.isBuiltin" icon="mdi-lock-outline" size="15" class="ml-2" /></td><td>{{ t(group.memberIds.length === 1 ? '{count} member' : '{count} members', { count: group.memberIds.length }) }}</td><td>{{ group.description || '—' }}</td><td><v-btn variant="text" @click="edit(group)">{{ t('Manage') }}</v-btn></td></tr><tr v-if="!loading && !groups.length"><td colspan="4">{{ t('No groups yet.') }}</td></tr></tbody></v-table></v-card>
    <v-dialog v-model="dialog" max-width="560" persistent><v-card :title="t(draft.id ? 'Manage group' : 'New group')"><v-card-text><v-form @submit.prevent="save">
      <v-text-field v-model="draft.name" :label="t('Group name')" :rules="[localizedRequired]" :readonly="draft.isBuiltin" :disabled="busy" maxlength="60" />
      <v-textarea v-model="draft.description" :label="t('Description')" rows="2" maxlength="500" :disabled="busy" />
      <h3 class="text-title-small mb-2">{{ t('Members') }}</h3>
      <v-checkbox v-for="user in eligibleUsers" :key="user.id" v-model="draft.memberIds" :label="`${fullName(user)} (${user.username})`" :value="user.id" :disabled="busy || draft.isBuiltin" hide-details />
      <v-alert color="secondary" variant="tonal" class="mt-4">{{ t('Membership changes do not grant operational permissions yet.') }}</v-alert>
      <v-alert v-if="dialogError" type="error" variant="tonal" class="mt-4">{{ t(dialogError) }}</v-alert>
      <div class="group-actions"><v-btn v-if="draft.id && !draft.isBuiltin" color="error" :disabled="busy" @click="deleteOpen = true">{{ t('Delete group') }}</v-btn><v-spacer /><v-btn :disabled="busy" @click="dialog = false">{{ t('Cancel') }}</v-btn><v-btn type="submit" color="primary" :loading="busy" :disabled="busy">{{ t(draft.id ? 'Save group' : 'Create group') }}</v-btn></div>
    </v-form></v-card-text></v-card></v-dialog>
    <v-dialog v-model="deleteOpen" max-width="440" persistent><v-card :title="t('Delete group?')"><v-card-text>{{ t('Remove {name}? Its members will keep their accounts.', { name: draft.name }) }}<v-alert v-if="dialogError" type="error" variant="tonal" class="mt-3">{{ t(dialogError) }}</v-alert></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="busy" @click="deleteOpen = false">{{ t('Cancel') }}</v-btn><v-btn color="error" :loading="busy" :disabled="busy" @click="remove">{{ t('Delete group') }}</v-btn></v-card-actions></v-card></v-dialog>
  </div>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { computed, onMounted, reactive, ref } from 'vue';
import userService from '@/services/userService';
import { fullName, required, userError } from '@/composables/userManagementUtils';
import type { GroupFields, UserGroup, UserRecord } from '@/services/userTypes';
import type { SubmitEventPromise } from 'vuetify';

const { t } = useLanguage();
function localizedRequired(value: Parameters<typeof required>[0]) {
  const result = required(value);
  return result === true ? true : t(result);
}

const groups = ref<UserGroup[]>([]), users = ref<UserRecord[]>([]), loading = ref(false), error = ref(''), dialog = ref(false), deleteOpen = ref(false), busy = ref(false), dialogError = ref('');
const draft = reactive<GroupFields & { id: number | null; isBuiltin: boolean }>({ id: null, name: '', description: '', memberIds: [], isBuiltin: false });
const eligibleUsers = computed(() => users.value.filter(user => draft.isBuiltin ? user.isBuiltin : !user.isBuiltin));
async function load() { loading.value = true; error.value = ''; try { const [g, u] = await Promise.all([userService.groups(), userService.getAll()]); groups.value = g.data; users.value = u.data; } catch (issue) { error.value = userError(issue); } finally { loading.value = false; } }
function edit(group?: UserGroup) { Object.assign(draft, group ? { ...group, memberIds: [...group.memberIds] } : { id: null, name: '', description: '', memberIds: [], isBuiltin: false }); dialogError.value = ''; dialog.value = true; }
async function save(event: SubmitEventPromise) { const result = await event; if (!result.valid || busy.value) return; busy.value = true; dialogError.value = ''; try { await userService.saveGroup(draft.id, { name: draft.name, description: draft.description, memberIds: [...draft.memberIds] }); dialog.value = false; await load(); } catch (issue) { dialogError.value = userError(issue); } finally { busy.value = false; } }
async function remove() { const id = draft.id; if (busy.value || id === null || draft.isBuiltin) return; busy.value = true; dialogError.value = ''; try { await userService.deleteGroup(id); deleteOpen.value = false; dialog.value = false; await load(); } catch (issue) { dialogError.value = userError(issue); } finally { busy.value = false; } }
onMounted(load);
</script>
<style scoped lang="scss">
.group-toolbar { display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:20px; }.group-toolbar p { color:rgb(var(--v-theme-muted));margin:0; }.groups-card { border-color:rgb(var(--v-theme-border)); }.groups-card strong { font-weight:500; }.group-actions { display:flex;gap:8px;flex-wrap:wrap;margin-top:22px; }
@media(max-width:650px) { .groups-card :deep(thead) {display:none}.groups-card :deep(table),.groups-card :deep(tbody) {display:block}.groups-card :deep(tr) {display:grid;grid-template-columns:1fr auto;gap:10px;padding:16px;border-bottom:1px solid rgb(var(--v-theme-border))}.groups-card :deep(td) {display:block;border:0!important;padding:0!important;height:auto!important}.groups-card :deep(td:nth-child(3)) {grid-column:1/-1} }
</style>
