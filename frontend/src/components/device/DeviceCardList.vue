<template>
  <v-container class="py-16 px-16 d-flex fill-height" fluid>
    <v-row class="align-center justify-center fill-height">
      <v-col v-if="loading">
        <div class="text-center">
          <v-progress-circular :size="80" color="primary" indeterminate></v-progress-circular>
        </div>
      </v-col>
      <v-col v-else-if="!loading" v-for="device in devices" :key="device" cols="3">
        <DeviceCard :cardData="device" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import DeviceCard from '@/components/device/DeviceCard.vue'
import mqttDataService from '@/services/mqttDataService'

export default {
  name: "DeviceCardList",
  data: () => ({
    loading: false,
    devices: [
      { host: "Host1", ip: "192.168.0.1", mac: "AA:BB:CC:DD:EE:01", rssi: -60 },
      { host: "Host2", ip: "192.168.0.2", mac: "AA:BB:CC:DD:EE:02", rssi: -62 },
    ],
  }),
  created() {
    try {
      mqttDataService.getAll().then((response) => {
        const { devicesInformation } = response.data;

        this.devices = devicesInformation.map(device => ({
          host: device.host,
          ip: device.ip,
          mac: device.mac,
          rssi: device.rssi
        }));
        this.loading = false
      });

    } catch (error) {
      alert(error);
    }
  },
  components: { DeviceCard }
}
</script>