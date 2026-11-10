<template>
  <div>
    <div class="invitation-toolbar"><p>{{ t('Invitations are single-use and expire automatically.') }}</p><v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="load">{{ t('Refresh') }}</v-btn></div>
    <v-alert v-if="error" type="error" variant="tonal" class="mb-4">{{ t(error) }}</v-alert>
    <v-alert v-if="notice" color="success" variant="tonal" class="mb-4" role="status">{{ t(notice) }}</v-alert>
    <v-progress-linear v-if="loading" indeterminate color="primary" />
    <v-card variant="outlined" class="invitation-card"><v-table><thead><tr><th>{{ t('Email') }}</th><th>{{ t('Status') }}</th><th>{{ t('Email submission') }}</th><th>{{ t('Expires') }}</th><th>{{ t('Actions') }}</th></tr></thead><tbody><tr v-for="invitation in invitations" :key="invitation.id"><td><strong>{{ invitation.email }}</strong><div class="invitation-groups"><v-chip v-for="group in invitation.groups" :key="group.id" size="small" variant="outlined">{{ group.name }}</v-chip></div></td><td><v-chip size="small" variant="tonal" :color="invitation.status === 'accepted' ? 'success' : invitation.status === 'pending' ? 'warning' : undefined">{{ t(invitation.status) }}</v-chip></td><td><span :class="{ 'text-error': invitation.deliveryStatus === 'failed' }">{{ t(deliveryLabel(invitation.deliveryStatus)) }}</span></td><td>{{ dateTime(invitation.expiresAt, '—') }}</td><td><div class="invitation-row-actions"><v-btn size="small" variant="text" @click="preview = invitation">{{ t('Preview email') }}</v-btn><v-btn v-if="['pending','expired'].includes(invitation.status)" size="small" variant="text" :disabled="busy || !emailConfiguration.configured" @click="confirmResend(invitation)">{{ t('Resend') }}</v-btn><v-btn v-if="invitation.status === 'pending'" size="small" variant="text" :disabled="busy" @click="confirmRevoke(invitation)">{{ t('Revoke') }}</v-btn></div></td></tr><tr v-if="!loading && !invitations.length"><td colspan="5" class="empty-invitations">{{ t('No invitations yet. Use Invite user to add someone.') }}</td></tr></tbody></v-table></v-card>
    <v-dialog :model-value="Boolean(preview)" max-width="500" @update:model-value="!$event && (preview = null)"><v-card v-if="preview" :title="t('Invitation email preview')"><v-card-text><p class="preview-meta">{{ t('To: {email}', { email: preview.email }) }}</p><h3 class="text-title-medium mt-4">{{ t('You are invited to Tomatoes') }}</h3><p class="mt-3">{{ t('You have been invited to join the Tomatoes hydroponics workspace.') }}</p><p v-if="preview.message" class="mt-3">{{ preview.message }}</p><p class="mt-3">{{ t('Expires: {time}', { time: dateTime(preview.expiresAt, '—') }) }}</p><v-alert color="secondary" variant="tonal" class="mt-4">{{ t('The private acceptance link is included in the email. It is not exposed in this preview.') }}</v-alert></v-card-text><v-card-actions><v-spacer /><v-btn @click="preview = null">{{ t('Close') }}</v-btn></v-card-actions></v-card></v-dialog>
    <v-dialog v-model="confirmation" max-width="460" persistent><v-card :title="t(actionTitle)"><v-card-text>{{ t(actionDescription, { email: actionEmail }) }}<v-alert v-if="actionError" type="error" variant="tonal" class="mt-3">{{ t(actionError) }}</v-alert></v-card-text><v-card-actions><v-spacer /><v-btn :disabled="busy" @click="confirmation = false">{{ t('Cancel') }}</v-btn><v-btn color="primary" :loading="busy" :disabled="busy" @click="perform">{{ t('Confirm') }}</v-btn></v-card-actions></v-card></v-dialog>
  </div>
</template>
<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
import { onMounted, ref, watch } from 'vue';
import userService from '@/services/userService';
import { dateTime, userError } from '@/composables/userManagementUtils';
import type { Invitation } from '@/services/userTypes';
import { useUserManagement } from './userManagementContext';

const { t } = useLanguage();

const { emailConfiguration, refreshInvitations } = useUserManagement();
const invitations = ref<Invitation[]>([]), loading = ref(false), error = ref(''), notice = ref(''), preview = ref<Invitation | null>(null), confirmation = ref(false), busy = ref(false), actionError = ref(''), actionTitle = ref(''), actionDescription = ref('');
const actionEmail = ref('');
let selectedAction: (() => Promise<unknown>) | undefined;
const deliveryLabel = (value: Invitation['deliveryStatus']) => ({ sent: 'Submitted to provider', failed: 'Not sent', queued: 'Sending' }[value] || value);
async function load() { loading.value = true; error.value = ''; try { invitations.value = (await userService.invitations()).data; } catch (issue) { error.value = userError(issue); } finally { loading.value = false; } }
function confirmResend(invitation: Invitation) { actionTitle.value = 'Resend invitation?'; actionEmail.value = invitation.email; actionDescription.value = 'Send a new invitation to {email}? The previous link will stop working.'; selectedAction = () => userService.resendInvitation(invitation.id); actionError.value = ''; confirmation.value = true; }
function confirmRevoke(invitation: Invitation) { actionTitle.value = 'Revoke invitation?'; actionEmail.value = invitation.email; actionDescription.value = 'The invitation for {email} will no longer be usable.'; selectedAction = () => userService.revokeInvitation(invitation.id); actionError.value = ''; confirmation.value = true; }
async function perform() { if (busy.value || !selectedAction) return; busy.value = true; actionError.value = ''; notice.value = ''; try { await selectedAction(); confirmation.value = false; notice.value = 'Invitation updated.'; } catch (issue) { actionError.value = userError(issue); } finally { busy.value = false; await load(); } }
watch(refreshInvitations, () => { notice.value = 'Invitation submitted to the email provider.'; load(); });
onMounted(load);
</script>
<style scoped lang="scss">
.invitation-toolbar { display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap; }.invitation-toolbar p,.preview-meta { color:rgb(var(--v-theme-muted));margin:0; }.invitation-card { border-color:rgb(var(--v-theme-border)); }.invitation-card strong {font-weight:500;overflow-wrap:anywhere}.invitation-groups,.invitation-row-actions {display:flex;gap:5px;flex-wrap:wrap;margin:6px 0}.empty-invitations {padding:30px!important;text-align:center}
@media(max-width:700px) { .invitation-card :deep(thead) {display:none}.invitation-card :deep(table),.invitation-card :deep(tbody) {display:block}.invitation-card :deep(tr) {display:flex;flex-wrap:wrap;gap:12px;padding:16px;border-bottom:1px solid rgb(var(--v-theme-border))}.invitation-card :deep(td) {display:block;border:0!important;padding:0!important;height:auto!important}.invitation-card :deep(td:first-child),.invitation-card :deep(td:last-child) {width:100%} }
</style>
