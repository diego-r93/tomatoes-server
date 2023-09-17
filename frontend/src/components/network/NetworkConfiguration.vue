<template>
  <v-card class="mt-4 mx-auto" color="#121212" max-width="400" variant="flat">
    <template v-slot:title>
      <v-icon color="#bdbdbd" icon="mdi-lan" size="x-large"></v-icon>
      <span class="ml-4 text-h5" style="color: #bdbdbd">
          Network Configuration
        </span>
    </template>
  </v-card>
  
  <v-card class="mt-4 mx-auto" max-width="1000" flat>
    <v-tabs v-model="tab" bg-color="#121212" color="basil" grow>
      <v-tab v-for="item in items" :key="item.id" :to="item.route">
        {{ item.name }}
      </v-tab>
    </v-tabs>

    <v-card>
      <router-view></router-view>
    </v-card>
  </v-card>
</template>

<script>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'NetworkConfig',
  setup() {
    const router = useRouter()
    const route = useRoute()

    const tab = ref(route.path)  // inicia a tab com a rota atual

    const items = [
      { id: 1, name: 'Lan', route: '/network/lan' },
      { id: 2, name: 'DNS', route: '/network/dns' },
      { id: 3, name: 'WPA Supplicant', route: '/network/wpa' },
      { id: 4, name: 'DHCP', route: '/network/dhcp' },
    ]

    const navigateTo = route => {
      router.push(route)
    }

    watch(() => route.path, newPath => {
      tab.value = newPath
    })

    return {
      items,
      tab,
      navigateTo
    }
  }
}
</script>