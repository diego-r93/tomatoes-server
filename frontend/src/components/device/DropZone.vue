<template>
  <div class="main">
    <div class="dropzone-container" @dragover="dragover" @dragleave="dragleave" @drop="drop">
      <input type="file" name="file" :id="inputId" class="hidden-input" @change="onChange" ref="fileInput" :disabled="disabled"
        accept=".bin" />

      <label :for="inputId" class="file-label">
        <div v-if="isDragging">{{ t('Release to drop files here.') }}</div>
        <div v-else>{{ t('Drop a .bin file here or') }} <u>{{ t('click here') }}</u> {{ t('to upload.') }}</div>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLanguage } from '@/composables/useLanguage';
const { t } = useLanguage();

import { ref, useId } from 'vue';
const props = defineProps({ disabled: Boolean });
const inputId = useId();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const emit = defineEmits<{ 'file-selected': [file: File] }>();

const onChange = () => {
  if (props.disabled) return;
  const file = fileInput.value?.files?.[0];
  if (file) emit('file-selected', file);
};

const dragover = (event: DragEvent) => {
  event.preventDefault();
  if (!props.disabled) isDragging.value = true;
};

const dragleave = () => {
  isDragging.value = false;
};

const drop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
  const file = event.dataTransfer?.files[0];
  if (!props.disabled && file) emit('file-selected', file);
};
</script>

<style scoped lang="scss">
.main {
  display: flex;
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.dropzone-container {
  padding: clamp(24px, 5vw, 64px);
  width: 100%;
  background: rgb(var(--v-theme-background));
  border: 1px dashed rgb(var(--v-theme-muted));
  border-radius: 10px;
}

.hidden-input {
  opacity: 0;
  overflow: hidden;
  position: absolute;
  width: 1px;
  height: 1px;
}

.file-label {
  font-size: 20px;
  display: block;
  cursor: pointer;
}

.preview-container {
  display: flex;
  margin-top: 2rem;
}

.preview-card {
  display: flex;
  border: 1px solid rgb(var(--v-theme-border));
  padding: 5px;
  margin-left: 5px;
}

.preview-img {
  width: 50px;
  height: 50px;
  border-radius: 5px;
  border: 1px solid rgb(var(--v-theme-border));
  background-color: rgb(var(--v-theme-border));
}
</style>
