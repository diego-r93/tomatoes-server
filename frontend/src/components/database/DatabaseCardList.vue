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
        <DatabaseCard :cardData="board" @delete="handleDelete" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted } from 'vue';
import DatabaseCard from './DatabaseCard.vue';
import mongoDataService from "@/services/mongoDataService";

export default {
  name: "DatabaseCardList",
  components: { DatabaseCard },
  setup() {
    const loading = ref(true);
    const boards = ref([]);

    const pumperCode = ref("");
    const pumperName = ref("");
    const pulseDuration = ref("");
    const driveTimes = ref([]);

    const addBoardFormIsVisible = ref(false);
    const form = ref(false);

    const handleDelete = (boardId) => {
      boards.value = boards.value.filter(board => board.id !== boardId);
    };

    const addNewBoard = async () => {
      loading.value = true;
      try {
        await mongoDataService.createBoard({
          pumperCode: pumperCode.value,
          pumperName: pumperName.value,
          pulseDuration: pulseDuration.value,
          driveTimes: driveTimes.value,
        });

        // Considerar usar uma biblioteca de toast para isso, como vue-toasted
        // alert("Nova placa adicionada com sucesso!");
        // Considerar usar o vue-router para navegar para a página desejada ao invés de recarregar a página
        // window.location.reload(); // Reloga a página, pode ser últil em algum outro lugar
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

    onMounted(() => {
      loadBoards();
    });

    return {
      boards,
      addBoardFormIsVisible,
      pumperCode,
      pumperName,
      pulseDuration,
      driveTimes,
      form,
      loading,
      handleDelete,
      addNewBoard,
      loadBoards
    };
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