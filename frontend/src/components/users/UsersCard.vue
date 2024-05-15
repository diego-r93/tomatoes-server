<template>
  <v-container class="py-16 px-16" fluid>
    <v-table>
      <thead>
        <tr>
          <th class="text-left">
            Login
          </th>
          <th class="text-left">
            Email
          </th>
          <th class="text-left">
            Name
          </th>
          <th class="text-left">
            Actions
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.login }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.firstName }} {{ user.lastName }}</td>
          <td>
            <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat" @click="editUser(user)">
              <v-icon color="orange-darken-2" icon="mdi-pencil-outline" size="medium">
              </v-icon>
            </v-btn>
            <v-btn class="ml-6 text-none rounded-xs custom-border" variant="flat" @click="removeUser(user.id)">
              <v-icon color="red" icon="mdi-delete-outline" size="medium">
              </v-icon>
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import userService from "@/services/userService";

const users = ref([]);  // Armazena os usuários recebidos do backend

// Função para obter os usuários
const fetchUsers = async () => {
  try {
    const response = await userService.getAll();
    users.value = response.data;
    console.log('Users fetched:', response.data);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

// Função para editar um usuário
const editUser = (user) => {
  console.log('Edit user:', user);
  // Lógica para editar o usuário (pode incluir abrir um modal ou redirecionar para uma página de edição)
};

// Função para remover um usuário
const removeUser = async (id) => {
  try {
    await userService.delete(id);
    fetchUsers();  // Recarrega a lista de usuários após a remoção
  } catch (error) {
    console.error('Error removing user:', error);
  }
};

onMounted(() => {
  fetchUsers();
});
</script>