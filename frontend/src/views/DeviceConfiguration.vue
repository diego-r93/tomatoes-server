<template>
  <v-container v-if="canManage" fluid class="app-page pb-0">
    <v-tabs v-model="tab" aria-label="Device sections">
      <v-tab value="devices">Devices</v-tab>
      <v-tab value="registration">Registration</v-tab>
    </v-tabs>
  </v-container>
  <DeviceCard v-if="tab === 'devices' || !canManage" />
  <DeviceRegistration v-else />
</template>

<script setup>
import { ref } from 'vue';
import Authentication from '@/services/auth';
import DeviceCard from '@/components/device/DeviceCardList.vue';
import DeviceRegistration from '@/components/device/DeviceRegistration.vue';

const tab = ref('devices');
const canManage = Boolean(Authentication.currentUser?.isAdmin);
</script>
