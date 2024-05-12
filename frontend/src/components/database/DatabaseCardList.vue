<template>
  <v-container v-if="loading" class="d-flex fill-height" fluid>
    <v-row>
      <v-col>
        <div class="text-center">
          <v-progress-circular :size="80" color="secondary" indeterminate></v-progress-circular>
        </div>
      </v-col>
    </v-row>
  </v-container>
  <v-container v-else class="d-flex fill-height align-start" fluid>
    <v-app-bar color="#121212" flat>
      <template v-slot:prepend>
        <v-icon color="#bdbdbd" icon="mdi-database" size="small"></v-icon>
      </template>
      <v-app-bar-title class="text-h6">
        <span style="color: #bdbdbd">
          Database / Boards
        </span>
      </v-app-bar-title>
      <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat" @click="addBoardFormIsVisible = true">
        <v-icon color="#bdbdbd" icon="mdi-timer-plus-outline">
        </v-icon>
      </v-btn>
      <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-cog-outline">
        </v-icon>
      </v-btn>
      <div class="pr-5">
        <v-btn class="text-none rounded-xs custom-border" variant="flat" @click="loadBoards">
          <v-icon color="#bdbdbd" icon="mdi-sync"></v-icon>
        </v-btn>
      </div>
    </v-app-bar>
    <v-row>
      <v-col v-for="board in boards" :key="board.id" cols="3">
        <DatabaseCard :cardData="board" @delete="handleDelete" @updateBoard="handleUpdateBoard"
          @updateDriveTimeState="handleUpdateDriveTimeState" />
      </v-col>
    </v-row>
  </v-container>

  <!-- Diálogo de Adição -->
  <v-dialog v-model="addBoardFormIsVisible" persistent max-width="400px">
    <v-card>
      <v-card-title>Add New Board</v-card-title>
      <v-card-text>
        <v-text-field v-model="pumperCode" label="Pumper Code" type="text"></v-text-field>
        <v-text-field v-model="pumperName" label="Pumper Name" type="text"></v-text-field>
        <v-text-field v-model="pulseDuration" label="Pulse Duration" type="text"></v-text-field>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="red darken-1" text @click="addBoardFormIsVisible = false">
          Cancel
        </v-btn>
        <v-btn color="green darken-1" text @click="addNewBoard">
          Add
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DatabaseCard from './DatabaseCard.vue';
import mongoDataService from "@/services/mongoDataService";

const loading = ref(true);
const boards = ref([]);

const pumperCode = ref("");
const pumperName = ref("");
const pulseDuration = ref("");
const driveTimes = ref([]);

const addBoardFormIsVisible = ref(false);

const addNewBoard = async () => {
  loading.value = true;
  try {
    await mongoDataService.createBoard({
      pumperCode: pumperCode.value,
      pumperName: pumperName.value,
      pulseDuration: pulseDuration.value,
      driveTimes: [{
        time: "06:00:00",
        state: false,
      }],
    });

    // Resetar os campos após a adição
    pumperCode.value = "";
    pumperName.value = "";
    pulseDuration.value = "";

    addBoardFormIsVisible.value = false;
    // Recarregar os boards
    await loadBoards();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};


const loadBoards = async () => {
  loading.value = true;
  try {
    const response = await mongoDataService.getAllBoards();
    boards.value = response.data;
  } catch (error) {
    console.log(error);
  } finally {
    loading.value = false;
  }
};

const handleUpdateBoard = async () => {
  await loadBoards();
};

const handleDelete = async (boardId) => {
  boards.value = boards.value.filter(board => board.id !== boardId);
  await loadBoards();
};

const handleUpdateDriveTimeState = ({ boardId, index, newState }) => {
  const boardToUpdate = boards.value.find(board => board.id === boardId.value);
  if (boardToUpdate) {
    boardToUpdate.driveTimes[index].state = newState;
  }
};

onMounted(() => {
  loadBoards();
});
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