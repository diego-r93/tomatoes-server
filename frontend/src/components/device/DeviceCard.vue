<template>
  <v-card class="custom-border">
    <v-layout>
      <v-app-bar color="#99deaa" density="compact">
        <template v-slot:prepend>
          <v-icon large color="#333333">mdi-chip</v-icon>
        </template>

        <v-app-bar-title>{{ cardData.host }}</v-app-bar-title>

        <template v-slot:append>
          <v-btn density="comfortable" icon="mdi-upload" color="#99deaa" variant="flat"
            @click="navigateToOTA(cardData)"></v-btn>
          <v-btn density="comfortable" icon="mdi-information-outline" color="#99deaa" variant="flat"
            @click="navigateToInfo(cardData)"></v-btn>
        </template>
      </v-app-bar>

      <v-main>
        <v-container fluid>
          <v-list lines="one" class="py-2">
            <v-list-item>
              <v-list-item-title>Hostname</v-list-item-title>
              <v-list-item-subtitle>{{ cardData.host }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>IP</v-list-item-title>
              <v-list-item-subtitle>{{ cardData.ip }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>MAC Address</v-list-item-title>
              <v-list-item-subtitle>{{ cardData.mac }}</v-list-item-subtitle>
            </v-list-item>
            <v-list-item>
              <v-list-item-title>RSSI</v-list-item-title>
              <v-list-item-subtitle>{{ cardData.rssi }}</v-list-item-subtitle>
            </v-list-item>

            <v-divider class="mt-4"></v-divider>
            <v-list class="py-4 px-6">
              <v-switch v-model="gpio.IO21" label="IO21" color="indigo" hide-details></v-switch>
              <v-switch v-model="gpio.IO19" label="IO19" color="indigo" hide-details></v-switch>
              <v-switch v-model="gpio.IO18" label="IO18" color="indigo" hide-details></v-switch>
              <v-switch v-model="gpio.IO05" label="IO05" color="indigo" hide-details></v-switch>
            </v-list>
          </v-list>
        </v-container>
      </v-main>
    </v-layout>

  </v-card>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import router from '@/router'
import mqttDataService from '@/services/mqttDataService'

import { useDeviceStore } from '@/store/deviceData';

const deviceStore = useDeviceStore();

const props = defineProps(['cardData'])

const gpio = ref({
  IO21: false,
  IO19: false,
  IO18: false,
  IO05: false
})

const gpioMapping = {
  IO21: '21',
  IO19: '19',
  IO18: '18',
  IO05: '5'
}

function navigateToOTA(deviceData) {
  deviceStore.setDeviceData(deviceData);
  router.push({ path: `/device/${deviceData.host}` });
}

function navigateToInfo(deviceData) {
  router.push({ path: `/device/${deviceData.host}/info` });
}

watchEffect(() => {
  updateGpio(gpio.value)
})

function updateGpio(gpioData) {
  const payload = {}

  for (const key in gpioData) {
    const gpioValue = gpioData[key]
    const gpioNumber = gpioMapping[key]

    payload[gpioNumber] = gpioValue
  }

  mqttDataService.updateGpio(props.cardData.host, payload)
    .then(() => {
      // Lógica adicional após a atualização do GPIO, se necessário
    })
    .catch(error => {
      console.error('Erro ao atualizar o GPIO:', error)
    })
}
</script>

