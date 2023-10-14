<template>
  <div class="main">
    <div class="dropzone-container" @dragover="dragover" @dragleave="dragleave" @drop="drop">
      <input type="file" multiple name="file" id="fileInput" class="hidden-input" @change="onChange" ref="fileInput"
        accept=".pdf,.jpg,.jpeg,.png" />

      <label for="fileInput" class="file-label text-white">
        <div v-if="isDragging">Release to drop files here.</div>
        <div v-else>Drop files here or <u>click here</u> to upload.</div>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, defineEmits  } from 'vue';

const isDragging = ref(false);
const fileInput = ref(null);

const emit = defineEmits(['file-selected']);

const onChange = () => {
  const files = fileInput.value.files;
  if (files.length > 0) {
    emit('file-selected', files[0]);
  }
};

const dragover = (event) => {
  event.preventDefault();
  isDragging.value = true;
};

const dragleave = () => {
  isDragging.value = false;
};

const drop = (element) => {
  element.preventDefault();
  fileInput.value.files = element.dataTransfer.files;
  onChange();
  isDragging.value = false;
};
</script>

<style scoped>
.main {
  display: flex;
  flex-grow: 1;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.dropzone-container {
  padding: 4rem;
  background: #121212;
  border: 1px dashed #bdbdbd;
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
  border: 1px solid #a2a2a2;
  padding: 5px;
  margin-left: 5px;
}

.preview-img {
  width: 50px;
  height: 50px;
  border-radius: 5px;
  border: 1px solid #a2a2a2;
  background-color: #a2a2a2;
}
</style>
