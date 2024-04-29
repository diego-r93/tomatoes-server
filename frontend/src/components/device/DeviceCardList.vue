<template>
  <v-container v-if="loading" class="d-flex fill-height" fluid>
    <v-row>
      <v-col>
        <div class="text-center">
          <v-progress-circular
            :size="80"
            color="primary"
            indeterminate
          ></v-progress-circular>
        </div>
      </v-col>
    </v-row>
  </v-container>
  <v-container v-else class="d-flex fill-height align-start" fluid>
    <v-app-bar color="#121212" flat>
      <template v-slot:prepend>
        <v-icon color="#bdbdbd" icon="mdi-chip" size="small"></v-icon>
      </template>
      <v-app-bar-title class="text-h6">
        <span style="color: #bdbdbd"> Devices / List </span>
      </v-app-bar-title>
      <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-cog-outline"> </v-icon>
      </v-btn>
      <div class="pr-5">
        <v-btn
          class="text-none rounded-xs custom-border"
          variant="flat"
          @click="fetchDevices"
        >
          <v-icon color="#bdbdbd" icon="mdi-sync"></v-icon>
        </v-btn>
      </div>
    </v-app-bar>
    <v-row>
      <v-col v-for="device in devices" :key="device.mac" cols="3">
        <DeviceCard :cardData="device" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted } from "vue";
import DeviceCard from "@/components/device/DeviceCard.vue";
import mqttDataService from "@/services/mqttDataService";

export default {
  name: "DeviceCardList",
  components: { DeviceCard },
  setup() {
    const loading = ref(true);
    const devices = ref([]);

    const fetchDevices = async () => {
      loading.value = true;
      try {
        const { data } = await mqttDataService.getAll();
        devices.value = data.devicesInformation.map((device) => ({
          host: device.host,
          ip: device.ip,
          mac: device.mac,
          rssi: device.rssi,
          datetime: device.datetime,
          ports: device.ports,
        }));
      } catch (error) {
        console.error(error);
        // alert('Houve um erro ao carregar os dispositivos.');
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchDevices();
    });

    return { loading, devices, fetchDevices };
  },
};
</script>

<style scoped>
.v-btn--size-default {
  --v-btn-size: 0.875rem;
  --v-btn-height: 32px;
  font-size: var(--v-btn-size);
  min-width: 36px;
  padding: 0 8px;
}
</style>