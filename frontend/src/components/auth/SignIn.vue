<template>
  <v-container fluid fill-height class="pa-16 gradient-container" style="height: 100%;">
    <v-row class="d-flex align-center justify-center" style="height: 100%;">
      <v-col cols="12" sm="8" md="6">
        <v-card class="mx-auto px-6 py-8 rounded-lg" max-width="400" elevation="12">
          <v-img src="@/assets/images/hydroponic.png" class="mx-auto" :width="100" height="100" contain>
          </v-img>
          <v-card-title class="text-center py-12">
            <h2 class="text-h4">Welcome</h2>
          </v-card-title>
          <v-form v-model="form" @submit.prevent="onSubmit">
            <v-text-field v-model="email" :readonly="loading" :rules="[required]" class="mb-2" clearable
              label="Email"></v-text-field>
            <v-text-field v-model="password" :append-inner-icon="show ? 'mdi-eye' : 'mdi-eye-off'" :readonly="loading"
              :rules="[required]" :type="show ? 'text' : 'password'" clearable label="Password"
              @click:append-inner="show = !show"></v-text-field>
            <br>
            <v-btn :disabled="!form" :loading="loading" block color="indigo" size="large" type="submit"
              variant="elevated">
              Log in
            </v-btn>
            <div class="text-center mt-2">
              <v-btn to="/resetpassword" class="transparent-btn text-indigo" elevation="0">
                <p class="text-capitalize">Forgot your password?</p>
              </v-btn>
            </div>
            <div class="text-center mt-2">
              <v-btn to="/signup" class="transparent-btn text-indigo" elevation="0">
                <p class="text-capitalize">Don't have an account yet? Register</p>
              </v-btn>
            </div>
          </v-form>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import router from '@/router';
import Authentication from '@/services/auth';
import UserService from '@/services/userService';

// Definindo estados reativos com `ref`
const show = ref(false);
const form = ref(false);
const email = ref("");
const password = ref("");
const loading = ref(false);

// Função para autenticação de usuário
const signin = async () => {
  try {
    const res = await UserService.login({
      email: email.value,
      password: password.value,
    });
    loading.value = false;
    Authentication.login();

    const user = res.data;

    const expiration = new Date().getTime() + 3600 * 1000;

    localStorage.setItem('tomatoesAccessToken', user.accessToken);
    localStorage.setItem('tomatoesExpiration', expiration.toString());
    localStorage.setItem('tomatoesUserId', user._id);
    localStorage.setItem('tomatoesUserData', JSON.stringify({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      state: user.state,
    }));

    router.push('/');
  } catch (error) {
    console.error(error.code);
    alert(error.message);
    loading.value = false;
  }
};

// Função para submeter formulário
const onSubmit = () => {
  if (!form.value) return;

  loading.value = true;
  signin();
};

// Função para validação de campos requeridos
const required = (v) => !!v || 'Field is required';

// Verificação de autenticação ao montar o componente
onMounted(() => {
  const token = localStorage.getItem('tomatoesAccessToken');
  const expiration = localStorage.getItem('tomatoesExpiration');

  if (token && expiration) {
    const currentTime = new Date().getTime();
    const authenticated = Authentication.isAuthenticated();

    if (currentTime < parseInt(expiration)) {
      if (!authenticated) {
        Authentication.login();
      }
      router.push('/');
    } else {
      Authentication.logout();
    }
  }
});
</script>

<style>
.gradient-container {
  background: linear-gradient(to bottom, #004d40, #002b27);
}
</style>