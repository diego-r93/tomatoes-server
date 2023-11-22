<template>
  <v-card class="custom-border">
    <v-card-title>{{ cardData.pumperName }}</v-card-title>
    <v-card-subtitle>{{ cardData.pumperCode }}</v-card-subtitle>
    <v-card-text>
      <div>Pulse Duration: {{ pulseDuration }}</div>
      <div class="py-2">Pumper Name: {{ pumperName }}</div>
      <v-divider></v-divider>
      <div v-if="hasDriveTimes">
        <v-virtual-scroll class="scroll-container" :items="driveTimes" height="250" item-height="50">
          <template v-slot:default="{ item, index }">
            <v-row class="align-center">
              <v-col class="flex-grow-1 text-start">
                {{ item.time }}
              </v-col>
              <v-col class="flex-grow-1">
                <v-switch v-model="item.state" hide-details color="indigo"
                  @change="editDriveTimeState(index, item.state)"></v-switch>
              </v-col>
              <v-col class="flex-grow-0">
                <v-btn icon class="elevation-0" @click="openEditDialog(index, item.time)">
                  <v-icon small>mdi-pencil</v-icon>
                </v-btn>
              </v-col>
              <v-col class="flex-grow-0">
                <v-btn icon class="elevation-0" @click="deleteDriveTimeAtIndex(index)">
                  <v-icon small>mdi-minus-circle-outline</v-icon>
                </v-btn>
              </v-col>
            </v-row>
          </template>
        </v-virtual-scroll>
      </div>
    </v-card-text>
    <v-card-actions class="pt-6">
      <v-btn @click="addNewDriveTime" color="#bdbdbd" variant="outlined">Add Time</v-btn>
      <v-btn @click="deleteBoard" color="#bdbdbd" variant="outlined">Delete</v-btn>
    </v-card-actions>
  </v-card>

  <!-- Diálogo de Edição -->
  <v-dialog v-model="isEditDialogOpen" persistent max-width="290px">
    <v-card>
      <v-card-title>Edit Time</v-card-title>
      <v-card-text>
        <v-text-field v-model="editedTime" label="New Time (hh:mm:ss)" type="text" :rules="[timeRules]"></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="red darken-1" text @click="isEditDialogOpen = false">
          Cancel
        </v-btn>
        <v-btn color="green darken-1" text @click="editDriveTime()">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import mongoDataService from "@/services/mongoDataService";

const props = defineProps(['cardData']);
const emit = defineEmits(['delete']);

// const pumperCode = ref(props.cardData.pumperCode);
const pumperName = ref(props.cardData.pumperName);
const pulseDuration = ref(props.cardData.pulseDuration);
const driveTimes = ref(props.cardData.driveTimes);
const loading = ref(false);

const isEditDialogOpen = ref(false);
const editedTime = ref('');
let editingIndex = -1;

// Regra de validação para o formato hh:mm:ss
const timeRules = [
  v => !!v || 'Time is required',
  v => /^(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)$/.test(v) || 'Time must be in format hh:mm:ss'
];

const hasDriveTimes = computed(() => driveTimes.value.length > 0);

// const editBoard = async () => {
//   try {
//     loading.value = true;
//     await mongoDataService.updateBoard(props.cardData.id, {
//       pumperCode: pumperCode.value,
//       pumperName: pumperName.value,
//       pulseDuration: pulseDuration.value,
//       driveTimes: driveTimes.value
//     });
//     // Usar um sistema de mensagens ou alertas mais amigável e moderno, como o Vuetify Snackbar
//     // alert("Board successfully updated!");
//   } finally {
//     loading.value = false;
//   }
// };

const deleteBoard = async () => {
  try {
    loading.value = true;
    await mongoDataService.deleteBoard(props.cardData.id, localStorage.accessToken);
    emit('delete', props.cardData.id);
  } finally {
    loading.value = false;
  }
};

const editDriveTimeState = async (index, newState) => {
  try {
    loading.value = true;
    await mongoDataService.editDriveTimeState(props.cardData.id, index, newState);
    driveTimes.value[index].state = newState;
  } catch (error) {
    console.error("Failed to edit drive time state:", error);
  } finally {
    loading.value = false;
  }
};

const deleteDriveTimeAtIndex = async (index) => {
  try {
    loading.value = true;
    await mongoDataService.deleteDriveTimeAtIndex(props.cardData.id, index);
    driveTimes.value.splice(index, 1);
  } catch (error) {
    console.error("Failed to delete drive time:", error);
  } finally {
    loading.value = false;
  }
};

const openEditDialog = (index, currentTime) => {
  editingIndex = index;
  editedTime.value = currentTime;
  isEditDialogOpen.value = true;
};

const editDriveTime = async () => {
  if (editingIndex !== -1) {
    try {
      loading.value = true;
      // Atualiza o tempo no driveTime editado
      driveTimes.value[editingIndex].time = editedTime.value;

      // Ordena os driveTimes
      driveTimes.value.sort((a, b) => a.time.localeCompare(b.time));

      // Salva as alterações no MongoDB
      await mongoDataService.replaceDriveTimes(props.cardData.id, driveTimes.value);

      isEditDialogOpen.value = false;
    } catch (error) {
      console.error("Failed to edit drive time:", error);
    } finally {
      loading.value = false;
    }
  }
};

const addNewDriveTime = () => {
  const newDriveTime = {
    time: '', // Inicializa com um valor padrão ou vazio
    state: false // O switch inicialmente definido como false
  };

  driveTimes.value.push(newDriveTime);
  openEditDialog(driveTimes.value.length - 1, newDriveTime.time);
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