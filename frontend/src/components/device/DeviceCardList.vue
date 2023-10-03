<template>
  <v-container v-if="loading" class="d-flex fill-height" fluid>
    <v-row>
      <v-col>
        <div class="text-center">
          <v-progress-circular :size="80" color="primary" indeterminate></v-progress-circular>
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
        <span style="color: #bdbdbd">
          Devices / List
        </span>
      </v-app-bar-title>
      <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-cog-outline">
        </v-icon>
      </v-btn>
    </v-app-bar>
    <v-row>
      <v-col v-for="device in devices" :key="device.mac" cols="2">        
          <DeviceCard :cardData="device" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import DeviceCard from '@/components/device/DeviceCard.vue';
import mqttDataService from '@/services/mqttDataService';

export default {
  name: "DeviceCardList",
  components: { DeviceCard },
  setup() {
    const loading = ref(false);
    const devices = ref([
    {
        host: 'Device-01',
        ip: '192.168.1.101',
        mac: 'AA:BB:CC:DD:EE:01',
        rssi: -60
      },
      {
        host: 'Device-02',
        ip: '192.168.1.102',
        mac: 'AA:BB:CC:DD:EE:02',
        rssi: -55
      },
      {
        host: 'Device-03',
        ip: '192.168.1.103',
        mac: 'AA:BB:CC:DD:EE:03',
        rssi: -65
      },
      {
        host: 'Device-04',
        ip: '192.168.1.104',
        mac: 'AA:BB:CC:DD:EE:04',
        rssi: -50
      }
    ]);

    onMounted(async () => {
      try {
        const { data } = await mqttDataService.getAll();
        devices.value = data.devicesInformation.map(device => ({
          host: device.host,
          ip: device.ip,
          mac: device.mac,
          rssi: device.rssi,
        }));
      } catch (error) {
        console.error(error);
        // alert('Houve um erro ao carregar os dispositivos.');
      } finally {
        loading.value = false;
      }
    });

    return { loading, devices };
  },
};
</script>
