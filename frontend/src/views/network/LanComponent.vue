<template>
  <v-card-text>
    {{ networkConfig }}
  </v-card-text>
</template>

<script>
import { ref, onMounted } from 'vue';
import networkDataService from '@/services/networkDataService';

export default {
  name: "NetworkComponent",
  setup() {
    const networkConfig = ref('');
    
    const loadNetworkConfig = async () => {
      try {
        const response = await networkDataService.getConfigFile('someType'); // Colocar as configurações
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
