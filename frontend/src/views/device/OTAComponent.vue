<template>
  <v-app-bar color="#121212" flat>
    <template v-slot:prepend>
      <v-btn density="compact" icon="mdi-arrow-left" size="large" color="#bdbdbd" @click="goBack"></v-btn>
    </template>
    <v-app-bar-title class="text-h6">
      <span style="color: #bdbdbd">
        Device / Boards
      </span>
    </v-app-bar-title>
  </v-app-bar>

  <v-container>
    <v-row class="mt-4">
      <v-col cols="12" class="d-flex justify-center">
        <v-img src="@/assets/images/update-logo-dark.png" max-width="280" alt="ElegantOTA"></v-img>
      </v-col>
      <v-col cols="12" v-if="loading">
        <v-progress-circular indeterminate></v-progress-circular>
      </v-col>
      <v-col cols="12" v-if="!loading && !uploading && OTAError !== null">
        <v-alert type="error" class="mx-auto" dense>
          <!-- SVG content for error -->
          {{ OTAError }}
        </v-alert>
      </v-col>
      <v-col cols="12" v-else-if="!loading && !uploading && OTASuccess">
        <v-alert type="success" class="mx-auto" dense>
          <!-- SVG content for success -->
          OTA Success
        </v-alert>
      </v-col>
      <v-col cols="12" v-else-if="!loading && !uploading">
        <v-row>
          <v-col cols="12">
            <v-radio-group class="mt-4 d-flex justify-center" v-model="type" inline>
              <v-radio label="Firmware" value="firmware"></v-radio>
              <v-radio label="Filesystem" value="filesystem"></v-radio>
            </v-radio-group>
          </v-col>
        </v-row>

        <v-row>
          <v-col class="text-center" cols="12">
            <DropFile />
            <v-btn class="mt-6" @click="submit">Upload</v-btn>
          </v-col>
        </v-row>

        <!-- <v-row class="mt-10">
          <v-col class="text-center" cols="12">
            <v-file-input variant="outlined" v-on:change="uploadOTA" ref="fileInput"></v-file-input>
            <v-btn class="mt-6" @click="submit">Upload</v-btn>
          </v-col>
        </v-row> -->

      </v-col>
      <v-col cols="12" v-if="!loading && uploading">
        <v-progress-linear :value="progress" color="primary"></v-progress-linear>
        <div class="text-center">{{ progress }}%</div>
      </v-col>
      <v-col cols="12" v-if="!loading">
        <div class="text-center">
          <v-chip>{{ deviceData.id }}</v-chip>
          <v-chip color="green">{{ deviceData.hardware }}</v-chip>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import router from '@/router'

import DropFile from "@/components/device/DropZone.vue";

import { useDeviceStore } from '@/store/deviceData';

const deviceStore = useDeviceStore();

const loading = ref(false); // Colocar true quandoe stiver finalizado
const uploading = ref(false);
const progress = ref(0);
const OTAError = ref(null);
const OTASuccess = ref(false);
const type = ref('firmware');
const file = ref(null);

const fileInput = ref(null);

const deviceData = ref({
  id: null,
  ip: null,
  hardware: null,
});

const goBack = () => {
  router.go(-1);
}

const uploadOTA = () => {
  file.value = fileInput.value.files[0];
};

const submit = () => {
  uploading.value = true;
  const formData = new FormData();
  formData.append('file', file.value);

  const request = new XMLHttpRequest();

  request.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) {
      const percentCompleted = Math.round((event.loaded / event.total) * 100);
      progress.value = percentCompleted;
    }
  });

  request.addEventListener('load', () => {
    if (request.status === 200) {
      OTASuccess.value = true;
    } else if (request.status !== 500) {
      OTAError.value = `[HTTP ERROR] ${request.statusText}`;
    } else {
      OTAError.value = request.responseText;
    }
    uploading.value = false;
    progress.value = 0;
  });

  request.withCredentials = true;

  request.addEventListener('error', (error) => {
    console.error(error);
    uploading.value = false;
    progress.value = 0;
  });

  request.open('POST', '/ota-update');
  request.send(formData);
};

const retryOTA = () => {
  OTAError.value = null;
  OTASuccess.value = false;
  uploadOTA();
};

const clear = () => {
  OTAError.value = null;
  OTASuccess.value = false;
};

onMounted(async () => {
  const { ip } = deviceStore.deviceData;
  console.log('IP:', ip);

   if (process.env.NODE_ENV === 'production') {
    fetch('/update/identity', {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(async (response) => {
        if (response.ok) {
          deviceData.value = await response.json();
          loading.value = false;
        }
      });
  }
});
</script>

<style></style>