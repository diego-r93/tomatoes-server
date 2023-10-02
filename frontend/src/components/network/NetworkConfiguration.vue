<template>
  <v-container class="py-6 px-2" fluid>
    <v-card class="mt-4 mx-auto" color="#121212" max-width="400" variant="flat">
      <template v-slot:title>
        <v-icon color="#bdbdbd" icon="mdi-lan" size="x-large"></v-icon>
        <span class="ml-4 text-h5" style="color: #bdbdbd">
          Network Configuration
        </span>
      </template>
    </v-card>

    <v-card class="mt-4 mx-auto" max-width="1400" flat>
      <v-tabs v-model="tab" bg-color="#121212" slider-color="teal-lighten-3" align-tabs="start">
        <v-tab v-for="item in items" :key="item.id" :to="item.route">
          <span style="color: #bdbdbd">
            {{ item.name }}
          </span>
        </v-tab>
      </v-tabs>

      <v-card class="custom-border">
        <v-card-text class="scroll-container">          
          <router-view></router-view>
        </v-card-text>
        <v-card-actions class="pt-12">
          <v-btn color="indigo" variant="flat" @click="saveChanges">Save</v-btn>
          <v-btn color="red" variant="flat" @click="cancel">Cancel</v-btn>
        </v-card-actions>

      </v-card>
    </v-card>
  </v-container>
</template>

<script>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export default {
  name: 'NetworkConfig',
  setup() {
    const router = useRouter()
    const route = useRoute()

    const tab = ref(route.path)

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

<style scoped>
.scroll-container {
  height: 500px;
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