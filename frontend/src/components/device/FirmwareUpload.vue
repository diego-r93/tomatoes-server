<template>
  <div class="firmware-upload">
    <v-row class="d-flex justify-center">
      <v-col cols="12" class="d-flex justify-center"><v-img src="@/assets/images/update-logo-dark.png" max-width="280" height="120" alt="ElegantOTA" /></v-col>
      <v-col v-if="phase === 'error'" cols="12" class="text-center result-state"><v-alert type="error" variant="tonal" role="alert">{{ error }}</v-alert><v-btn class="mt-6" variant="outlined" @click="reset">Return</v-btn></v-col>
      <v-col v-else-if="phase === 'success'" cols="12" class="text-center result-state"><v-alert type="success" variant="tonal" role="status">Firmware verified. The board will restart.</v-alert><v-btn class="mt-6" variant="outlined" @click="reset">Return</v-btn></v-col>
      <v-col v-else-if="uploading" cols="12" class="text-center upload-progress"><v-progress-linear :model-value="progress ?? 0" :indeterminate="progress === null" color="primary" height="8" aria-label="Firmware upload progress" /><p class="mt-6">{{ progress === null ? 'Uploading…' : `${progress}%` }}</p><p class="firmware-note">Keep this window open until the device responds.</p></v-col>
      <v-col v-else cols="12">
        <DropFile :key="fileKey" :disabled="uploading" @file-selected="selectFile" />
        <p v-if="selectedFile" class="selected-file">{{ selectedFile.name }} · {{ formatSize(selectedFile.size) }}</p>
        <v-alert v-if="validationError" type="error" variant="tonal" class="mt-4" role="alert">{{ validationError }}</v-alert>
        <p v-if="!online" class="firmware-note">The device has not replied recently. Refresh its connection before uploading.</p>
        <div class="upload-action"><v-btn color="primary" :disabled="!selectedFile || !online || !device.ip || uploading" @click="submit">Upload</v-btn></div>
      </v-col>
      <v-col v-if="sha256" cols="12" class="text-center selected-file">SHA-256 {{ sha256 }}</v-col>
      <v-col cols="12" class="text-center target-device"><v-chip variant="outlined">{{ device.host }}</v-chip><v-chip class="ml-2" color="success" variant="tonal">{{ device.ip }}</v-chip></v-col>
    </v-row>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
import DropFile from './DropZone.vue';
import OTAService from '@/services/OTAService';
const props = defineProps({ device: { type: Object, required: true }, online: Boolean });
const emit = defineEmits(['busy', 'completed']);
const sha256 = ref('');
const selectedFile = ref(null), fileKey = ref(0), validationError = ref(''), error = ref(''), progress = ref(null), phase = ref('ready');
const uploading = computed(() => phase.value === 'uploading');
const formatSize = bytes => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
function selectFile(file) {
  selectedFile.value = null; validationError.value = '';
  if (!file || !file.name.toLowerCase().endsWith('.bin') || file.size === 0 || file.size > 6553600) { validationError.value = 'Choose a non-empty .bin firmware file up to 6,553,600 bytes.'; return; }
  selectedFile.value = file;
}
function reset() { if (uploading.value) return; phase.value = 'ready'; sha256.value = ''; error.value = ''; selectedFile.value = null; fileKey.value++; progress.value = null; }
async function submit() {
  if (uploading.value || !selectedFile.value || !props.online || !props.device.ip) return;
  const formData = new FormData(); formData.append('file', selectedFile.value);
  phase.value = 'uploading'; error.value = ''; progress.value = null; emit('busy', true);
  try {
    const response = await OTAService.uploadFile(props.device.host, formData, event => { if (event.total > 0) progress.value = Math.min(99, Math.round(event.loaded / event.total * 100)); });
    sha256.value = response.data?.sha256 || '';
    if (response.data?.ok !== true) throw new Error('The device did not confirm the image.');
    progress.value = 100; phase.value = 'success'; emit('completed');
  } catch (issue) { sha256.value = issue.response?.data?.sha256 || ''; error.value = issue.response?.data?.error || issue.response?.data?.message || issue.message || 'The firmware upload could not be completed.'; phase.value = 'error'; }
  finally { emit('busy', false); }
}
</script>
<style scoped lang="scss">
.firmware-upload { padding: 4px 8px 8px; }.upload-type { display: flex; justify-content: center; margin: 16px 0 8px; }.upload-type :deep(.v-selection-control-group) { justify-content: center; }.upload-action { text-align: center; margin-top: 24px; }.selected-file { margin-top: 14px; text-align: center; overflow-wrap: anywhere; font-size: 13px; }.firmware-note { color: rgb(var(--v-theme-muted)); font-size: 12px; text-align: center; margin-top: 12px; }.result-state,.upload-progress { padding-block: 28px; }.target-device { padding-top: 20px; display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
</style>
