<template>
  <v-card class="custom-border">
    <v-card-title>{{ cardData.pumperName }}</v-card-title>
    <v-card-subtitle>{{ cardData.pumperCode }}</v-card-subtitle>
    <v-card-text>
      <div>Pulse Duration: {{ pulseDuration }}</div>
      <div class="py-2">Pumper Name: {{ pumperName }}</div>
      <v-divider></v-divider>
      <div v-if="hasDriveTimes">
        <v-virtual-scroll class="scroll-container" :items="driveTimes" height="250" item-height="50" :bench="keepAliveAmount">
          <template v-slot:default="{ item }">
            <v-row class="align-center">
              <v-col class="flex-grow-1 text-start">
                {{ item.time }}
              </v-col>
              <v-col class="flex-grow-1">
                <v-switch v-model="item.state" hide-details color="indigo"></v-switch>
              </v-col>
              <v-col class="flex-grow-0">
                <v-btn icon class="elevation-0">
                  <v-icon small>mdi-minus-circle-outline</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </template>
        </v-virtual-scroll>
      </div>
    </v-card-text>
    <v-card-actions class="pt-6">
      <v-btn @click="editBoard" color="#bdbdbd" variant="outlined">Edit</v-btn>
      <v-btn @click="deleteBoard" color="#bdbdbd" variant="outlined">Delete</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { ref, computed } from 'vue';
import mongoDataService from "@/services/mongoDataService";

const props = defineProps(['cardData']);
const emit = defineEmits(['delete']);

const pumperCode = ref(props.cardData.pumperCode);
const pumperName = ref(props.cardData.pumperName);
const pulseDuration = ref(props.cardData.pulseDuration);
const driveTimes = ref(props.cardData.driveTimes);
const loading = ref(false);

const hasDriveTimes = computed(() => driveTimes.value.length > 0);

const editBoard = async () => {
  try {
    loading.value = true;
    await mongoDataService.updateBoard(props.cardData.id, {
      pumperCode: pumperCode.value,
      pumperName: pumperName.value,
      pulseDuration: pulseDuration.value,
      driveTimes: driveTimes.value
    }, localStorage.accessToken);
    // Aqui pode usar um sistema de mensagens ou alertas mais amigável e moderno, como o Vuetify Snackbar
    // alert("Board successfully updated!");
  } finally {
    loading.value = false;
  }
};

const deleteBoard = async () => {
  try {
    loading.value = true;
    await mongoDataService.deleteBoard(props.cardData.id, localStorage.accessToken);
    emit('delete', props.cardData.id);
  } finally {
    loading.value = false;
  }
};
</script>


<style scoped>
.scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
}

.scroll-container::-webkit-scrollbar {
  width: 3px;
}

.scroll-container::-webkit-scrollbar-thumb {
  background-color: #bdbdbd;
  border-radius: 4px;
}

.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
</style>