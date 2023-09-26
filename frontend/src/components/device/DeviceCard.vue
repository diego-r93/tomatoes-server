<template>
  <v-card color="#99deaa" max-width="350" class="custom-border">
    <v-container>
      <v-row>
        <v-col cols="2" class="align-self-center">
          <v-icon large color="#333333">mdi-chip</v-icon>
        </v-col>
        <v-col cols="8" class="align-self-center text-center">
          {{ cardData.host }}
        </v-col>
        <v-col cols="2" class="align-self-center">
          <v-btn density="comfortable" icon="mdi-information-outline" color="#99deaa" variant="flat"></v-btn>
        </v-col>
      </v-row>
    </v-container>

    <v-list lines="one" class="py-2 px-2">
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title>Hostname</v-list-item-title>
          <v-list-item-subtitle>{{ cardData.host }}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title>IP</v-list-item-title>
          <v-list-item-subtitle>{{ cardData.ip }}</v-list-item-subtitle>
        </v-list-item-content></v-list-item>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title>MAC Address</v-list-item-title>
          <v-list-item-subtitle>{{ cardData.mac }}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
      <v-list-item>
        <v-list-item-content>
          <v-list-item-title>RSSI</v-list-item-title>
          <v-list-item-subtitle>{{ cardData.rssi }}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>


      <v-divider class="mt-4"></v-divider>
      <v-list class="py-4 px-6">
        <v-switch v-model="gpio.IO21" label="IO21" color="indigo" hide-details></v-switch>
        <v-switch v-model="gpio.IO19" label="IO19" color="indigo" hide-details></v-switch>
        <v-switch v-model="gpio.IO18" label="IO18" color="indigo" hide-details></v-switch>
        <v-switch v-model="gpio.IO05" label="IO05" color="indigo" hide-details></v-switch>
      </v-list>
    </v-list>
  </v-card>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import mqttDataService from '@/services/mqttDataService'

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

