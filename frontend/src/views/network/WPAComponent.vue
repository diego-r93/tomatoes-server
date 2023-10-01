<template>
  <v-card-text>
    <pre>{{ networkConfig }}</pre>
  </v-card-text>
</template>

<script>
import { ref, onMounted } from 'vue';
import networkDataService from '@/services/networkDataService';

export default {
  name: "WPASupplicantComponent",
  setup() {
    const networkConfig = ref('');
    
    const loadNetworkConfig = async () => {
      try {
        const response = await networkDataService.getConfigFile('wpa_supplicant');
        if (response && response.data) {
          networkConfig.value = response.data.data;
        }
      } catch (error) {
        console.error('Erro ao buscar configuração de rede', error);
      }
    }
    
    onMounted(loadNetworkConfig);
    
    return {
      networkConfig
    }
  }
};
</script>