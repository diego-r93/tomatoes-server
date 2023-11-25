<template>
  <v-card class="custom-border">
    <v-row class="d-flex align-center justify-space-between">
      <v-col>
        <v-card-title>{{ cardData.pumperName }}</v-card-title>
      </v-col>
      <v-col class="d-flex justify-end">
        <!-- Botão de Edição -->
        <v-btn icon class="elevation-0" variant="plain" @click="openEditBoardDialog">
          <v-icon>mdi-pencil-outline</v-icon>
        </v-btn>

        <!-- Botão de Exclusão -->
        <v-btn icon class="elevation-0" variant="plain" @click="confirmDeleteBoard">
          <v-icon>mdi-trash-can-outline</v-icon>
        </v-btn>
      </v-col>
    </v-row>
    <v-card-subtitle>{{ cardData.pumperCode }}</v-card-subtitle>
    <v-card-text>
      <div class="py-2">Pumper Name: {{ pumperName }}</div>
      <div class="pb-4">Pulse Duration: {{ pulseDuration }}</div>
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
    </v-card-actions>
  </v-card>

  <!-- Diálogo de Edição do Board -->
  <v-dialog v-model="isEditBoardDialogOpen" persistent max-width="290px">
    <v-card>
      <v-card-title>Edit Board</v-card-title>
      <v-card-text>
        <v-text-field v-model="editablePumperCode" label="Pumper Code" type="text"></v-text-field>
        <v-text-field v-model="editablePumperName" label="Pumper Name" type="text"></v-text-field>
        <v-text-field v-model="editablePulseDuration" label="Pulse Duration" type="text"></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="red darken-1" text @click="isEditBoardDialogOpen = false">
          Cancel
        </v-btn>
        <v-btn color="green darken-1" text @click="editBoard">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>


  <!-- Diálogo de Adição -->
  <v-dialog v-model="isAddDialogOpen" persistent max-width="290px">
    <v-card>
      <v-card-title>Add New Drive Time</v-card-title>
      <v-card-text>
        <v-text-field v-model="newDriveTime" label="New Time (hh:mm:ss)" type="text" :rules="[timeRules]"></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="red darken-1" text @click="isAddDialogOpen = false">
          Cancel
        </v-btn>
        <v-btn color="green darken-1" text @click="confirmAddNewDriveTime">
          Add
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

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

  <!-- Diálogo de Confirmação de Exclusão -->
  <v-dialog v-model="isDeleteDialogOpen" persistent max-width="300px">
    <v-card>
      <v-card-title class="headline">Confirm Deletion</v-card-title>
      <v-card-text>
        Are you sure you want to delete this card?
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="green darken-1" text @click="deleteBoard">
          Confirm
        </v-btn>
        <v-btn color="red darken-1" text @click="isDeleteDialogOpen = false">
          Cancel
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

const isAddDialogOpen = ref(false);
const isEditDialogOpen = ref(false);
const isDeleteDialogOpen = ref(false);

const editablePumperCode = ref('');
const editablePumperName = ref('');
const editablePulseDuration = ref('');
const isEditBoardDialogOpen = ref(false);

const newDriveTime = ref('');
const editedTime = ref('');
let editingIndex = -1;

// Regra de validação para o formato hh:mm:ss
const timeRules = [
  v => !!v || 'Time is required',
  v => /^(?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)$/.test(v) || 'Time must be in format hh:mm:ss'
];

const hasDriveTimes = computed(() => driveTimes.value.length > 0);

const openEditBoardDialog = () => {
  editablePumperCode.value = props.cardData.pumperCode;
  editablePumperName.value = props.cardData.pumperName;
  editablePulseDuration.value = props.cardData.pulseDuration;
  isEditBoardDialogOpen.value = true;
};

const editBoard = async () => {
  try {
    loading.value = true;
    const updatedBoard = {
      id: props.cardData.id,
      pumperCode: editablePumperCode.value,
      pumperName: editablePumperName.value,
      pulseDuration: editablePulseDuration.value,
      // driveTimes mantém-se inalterado
    };

    await mongoDataService.updateBoard(updatedBoard.id, updatedBoard);

    // Emita um evento com os dados atualizados
    emit('updateBoard', updatedBoard);

    isEditBoardDialogOpen.value = false;
  } catch (error) {
    console.error("Failed to edit board:", error);
  } finally {
    loading.value = false;
  }
};

const confirmDeleteBoard = async () => {
  isDeleteDialogOpen.value = true;
};

const deleteBoard = async () => {
  isDeleteDialogOpen.value = false;

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
  newDriveTime.value = '';
  isAddDialogOpen.value = true;
};

const confirmAddNewDriveTime = async () => {
  if (newDriveTime.value) {
    const newTime = {
      time: newDriveTime.value,
      state: false
    };

    driveTimes.value.push(newTime); // Adiciona o novo tempo

    try {
      loading.value = true;
      // Salva as alterações no MongoDB
      await mongoDataService.replaceDriveTimes(props.cardData.id, driveTimes.value);
    } catch (error) {
      console.error("Failed to add new drive time:", error);
    } finally {
      loading.value = false;
      isAddDialogOpen.value = false; // Fechar o diálogo após a conclusão
      newDriveTime.value = ''; // Resetar o valor
    }
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