<template>
  <div>
    <v-app-bar color="#121212" flat>
      <template v-slot:prepend>
        <v-btn
          density="compact"
          icon="mdi-arrow-left"
          size="large"
          color="#bdbdbd"
          @click="goBack"
        ></v-btn>
      </template>
      <v-app-bar-title class="text-h6">
        <span style="color: #bdbdbd"> Device / Boards </span>
      </v-app-bar-title>
    </v-app-bar>

    <v-container>
      <v-row class="mt-4 d-flex justify-center">
        <v-col cols="12" class="d-flex justify-center">
          <v-img
            src="@/assets/images/update-logo-dark.png"
            max-width="280"
            alt="ElegantOTA"
          ></v-img>
        </v-col>
        <v-col cols="12" v-if="loading">
          <v-progress-circular indeterminate></v-progress-circular>
        </v-col>
        <v-col
          cols="4"
          class="text-center my-10"
          v-if="!loading && !uploading && OTAError !== null"
        >
          <v-alert type="error" dense>
            {{ OTAError }}
          </v-alert>
          <v-btn class="mt-10" @click="retryOTA">Return</v-btn>
        </v-col>
        <v-col
          cols="4"
          class="text-center my-10"
          v-else-if="!loading && !uploading && OTASuccess"
        >
          <v-alert type="success" dense> OTA Success </v-alert>
          <v-btn class="mt-10" @click="clear">Return</v-btn>
        </v-col>
        <v-col cols="12" v-else-if="!loading && !uploading">
          <v-row>
            <v-col cols="12">
              <v-radio-group
                class="mt-4 d-flex justify-center"
                v-model="type"
                inline
              >
                <v-radio label="Firmware" value="firmware"></v-radio>
                <v-radio label="Filesystem" value="filesystem"></v-radio>
              </v-radio-group>
            </v-col>
          </v-row>

          <v-row>
            <v-col class="text-center" cols="12">
              <DropFile @file-selected="uploadOTA" />
              <v-btn class="mt-10" @click="submit">Upload</v-btn>
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="6" class="text-center my-10" v-if="!loading && uploading">
          <v-progress-linear
            :model-value="progress"
            color="primary"
            height="8"
          ></v-progress-linear>
          <div class="text-center mt-8">{{ progress }}%</div>
        </v-col>
        <v-col cols="12" v-if="!loading">
          <div class="text-center pt-2">
            <v-chip>{{ deviceData.host }}</v-chip>
            <v-chip class="ml-2" color="green">{{ deviceData.ip }}</v-chip>
          </div>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import router from "@/router";

import DropFile from "@/components/device/DropZone.vue";

import { useDeviceStore } from "@/store/deviceData";
import OTAService from "@/services/OTAService";

const deviceStore = useDeviceStore();

const loading = ref(false); // Colocar true quandoe stiver finalizado
const uploading = ref(false);
const progress = ref(0);
const OTAError = ref(null);
const OTASuccess = ref(false);
const type = ref("firmware");
const selectedFile = ref(null);

const deviceData = ref({
  host: null,
  ip: null,
});

const goBack = () => {
  router.go(-1);
};

const uploadOTA = (file) => {
  selectedFile.value = file;
};

const submit = () => {
  if (!selectedFile.value) {
    // Caso nenhum arquivo seja selecionado
    console.log("Nenhum arquivo selecionado");
    return;
  }

  uploading.value = true;
  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("ip", deviceData.value.ip);

  // Registrando o nome do arquivo no console
  console.log("Enviando arquivo:", selectedFile.value.name);
  console.log("Para:", deviceData.value.ip);

  OTAService.uploadFile(deviceData.value.ip, formData, (event) => {
    if (event.lengthComputable) {
      const percentCompleted = Math.round((event.loaded / event.total) * 100);
      progress.value = percentCompleted;
    }
  })
    .then((response) => {
      if (response.status === 200) {
        OTASuccess.value = true;
      }
    })
    .catch((error) => {
      console.error(error);
      OTAError.value = error.message;
    })
    .finally(() => {
      uploading.value = false;
      progress.value = 0;
    });
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
  const { host, ip } = deviceStore.deviceData;
  deviceData.value = { host, ip };
});
</script>

<style></style>