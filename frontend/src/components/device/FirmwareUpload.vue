<template>
  <div class="firmware-upload">
    <v-row class="d-flex justify-center">
      <v-col cols="12" class="d-flex justify-center"><v-img src="@/assets/images/update-logo-dark.png" max-width="280" height="120" alt="ElegantOTA" /></v-col>
      <v-col v-if="busy" cols="12" class="upload-progress">
        <div class="progress-heading">
          <strong>Upload to server</strong>
          <span>{{ progress === null ? 'Sending…' : `${progress}%` }}</span>
        </div>
        <v-progress-linear
          :model-value="progress ?? 0"
          :indeterminate="progress === null"
          :color="phase === 'verifying' ? 'success' : 'primary'"
          height="8"
          rounded
          aria-label="Firmware upload to server"
        />
        <div v-if="phase === 'verifying'" class="board-progress" role="status">
          <v-progress-circular indeterminate color="primary" size="20" width="2" aria-hidden="true" />
          <span>File sent. Waiting for the board to confirm installation…</span>
        </div>
        <p v-else class="firmware-note" role="status">Sending the firmware file to the server.</p>
      </v-col>
      <v-col v-else-if="phase === 'success'" cols="12" class="result-state">
        <v-alert type="success" variant="tonal" title="Firmware installed" role="status">
          {{ confirmedByRestart
            ? 'The board came back online after the transfer. The update was confirmed by its restart.'
            : 'The board confirmed the firmware was installed and verified. It will restart shortly.' }}
        </v-alert>
        <p class="firmware-note" role="status">{{ restartMessage }}</p>
        <div class="upload-action"><v-btn variant="outlined" :disabled="waitingForRestart" @click="reset">Choose another file</v-btn></div>
      </v-col>
      <v-col v-else-if="phase === 'error' || phase === 'unconfirmed'" cols="12" class="result-state">
        <v-alert
          :type="phase === 'unconfirmed' ? 'warning' : 'error'"
          :title="phase === 'unconfirmed' ? 'Installation not confirmed' : 'Firmware update failed'"
          variant="tonal"
          role="alert"
        >
          {{ error }}
          <p v-if="phase === 'unconfirmed'" class="mt-2">Check the board before trying again.</p>
        </v-alert>
        <div class="upload-action"><v-btn variant="outlined" @click="reset">Back to file selection</v-btn></div>
      </v-col>
      <v-col v-else cols="12">
        <DropFile :key="fileKey" @file-selected="selectFile" />
        <p v-if="selectedFile" class="selected-file">{{ selectedFile.name }} · {{ formatSize(selectedFile.size) }}</p>
        <v-alert v-if="validationError" type="error" variant="tonal" class="mt-4" role="alert">{{ validationError }}</v-alert>
        <div class="upload-action"><v-btn color="primary" :disabled="!selectedFile || !online || !device.ip" @click="submit">Upload</v-btn></div>
      </v-col>
      <v-col v-if="!busy && !online" cols="12" class="firmware-note">
        <p v-if="!waitingForRestart">The device has not replied recently.</p>
        <v-btn variant="text" :loading="refreshing" @click="emit('refresh')">Refresh connection</v-btn>
      </v-col>
      <v-col v-if="sha256" cols="12" class="text-center selected-file">SHA-256 {{ sha256 }}</v-col>
      <v-col cols="12" class="text-center target-device"><v-chip variant="outlined">{{ device.host }}</v-chip><v-chip class="ml-2" color="success" variant="tonal">{{ device.ip }}</v-chip></v-col>
    </v-row>
  </div>
</template>
<script setup>
import { computed, ref, watch } from 'vue';
import DropFile from './DropZone.vue';
import OTAService from '@/services/OTAService';
const props = defineProps({ device: { type: Object, required: true }, online: Boolean, refreshing: Boolean, clock: { type: Number, required: true } });
const emit = defineEmits(['busy', 'refresh']);
const sha256 = ref('');
const confirmedByRestart = ref(false);
const restart = ref(null);
const onlineFirmware = ref('');
const waitingForRestart = computed(() => restart.value && !onlineFirmware.value && props.clock < restart.value.deadline);
const restartMessage = computed(() => {
  if (onlineFirmware.value) return `Back online, firmware ${onlineFirmware.value}`;
  return waitingForRestart.value ? 'Waiting for the board to restart' : 'The board has not reported its firmware after the restart yet.';
});
watch([() => props.device, () => props.online, restart], ([device, online, update]) => {
  if (!update || !online || !device.fw || !(device.receivedAt > update.receivedAt && device.receivedAt >= update.startedAt)) return;
  const uptimeReset = typeof device.uptime === 'number' && typeof update.uptime === 'number' && device.uptime >= 0 && device.uptime < update.uptime;
  const reportedAfterConfirmation = confirmedByRestart.value && device.receivedAt >= update.confirmedAt;
  if (reportedAfterConfirmation || (update.fw && device.fw !== update.fw) || uptimeReset) onlineFirmware.value = device.fw;
});
const selectedFile = ref(null), fileKey = ref(0), validationError = ref(''), error = ref(''), progress = ref(null), phase = ref('ready');
const busy = computed(() => phase.value === 'uploading' || phase.value === 'verifying');
const formatSize = bytes => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
function selectFile(file) {
  selectedFile.value = null; validationError.value = '';
  if (!file || !file.name.toLowerCase().endsWith('.bin') || file.size === 0 || file.size > 6553600) { validationError.value = 'Choose a non-empty .bin firmware file up to 6,553,600 bytes.'; return; }
  selectedFile.value = file;
}
function reset() {
  if (busy.value) return;
  phase.value = 'ready';
  restart.value = null;
  onlineFirmware.value = '';
  sha256.value = '';
  error.value = '';
  selectedFile.value = null;
  fileKey.value++;
  progress.value = null;
}

function updateUploadProgress({ loaded, total }) {
  if (phase.value !== 'uploading' || !Number.isFinite(total) || total <= 0) return;
  progress.value = Math.max(0, Math.min(100, Math.floor(loaded / total * 100)));
  if (loaded >= total) phase.value = 'verifying';
}

async function submit() {
  if (busy.value || !selectedFile.value || !props.online || !props.device.ip) return;

  const { fw, uptime, receivedAt } = props.device;
  const beforeUpload = { fw, uptime, receivedAt: receivedAt ?? 0, startedAt: Date.now() };
  const formData = new FormData();
  formData.append('file', selectedFile.value);
  phase.value = 'uploading';
  error.value = '';
  sha256.value = '';
  progress.value = null;
  emit('busy', true);

  try {
    const { data } = await OTAService.uploadFile(props.device.host, formData, updateUploadProgress);
    sha256.value = data?.sha256 || '';
    if (data?.ok !== true) {
      error.value = 'The server returned an unexpected result.';
      phase.value = 'unconfirmed';
      return;
    }
    confirmedByRestart.value = data.confirmation === 'restart';
    phase.value = 'success';
    const confirmedAt = Date.now();
    restart.value = { ...beforeUpload, confirmedAt, deadline: confirmedAt + 120_000 };
    emit('refresh');
  } catch (issue) {
    const status = issue.response?.status;
    const data = issue.response?.data;
    sha256.value = data?.sha256 || '';
    const unconfirmed = !status || status === 504 || (status === 502 && data?.ok !== false);
    error.value = data?.error || data?.message || (unconfirmed
      ? 'The connection ended before the board confirmed the update.'
      : 'The server rejected the firmware update.');
    phase.value = unconfirmed ? 'unconfirmed' : 'error';
  } finally {
    emit('busy', false);
  }
}
</script>
<style scoped lang="scss">
.firmware-upload { padding: 4px 8px 8px; }
.upload-action { text-align: center; margin-top: 24px; }
.selected-file { margin-top: 14px; text-align: center; overflow-wrap: anywhere; font-size: 13px; }
.firmware-note { color: rgb(var(--v-theme-muted)); font-size: 13px; text-align: center; margin-top: 12px; }
.result-state, .upload-progress { padding-block: 24px; }
.progress-heading, .board-progress { display: flex; align-items: center; gap: 12px; }
.progress-heading { justify-content: space-between; margin-bottom: 10px; }
.progress-heading span { font-variant-numeric: tabular-nums; }
.board-progress { margin-top: 18px; }
.board-progress .v-progress-circular { flex-shrink: 0; }
.target-device { padding-top: 20px; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
</style>
