<template>
  <v-app-bar color="#121212" flat>
    <template v-slot:prepend>
      <v-btn density="compact" icon="mdi-arrow-left" size="large" color="#bdbdbd" @click="goBack"></v-btn>
    </template>
    <v-app-bar-title class="text-h6">
      <span style="color: #bdbdbd">
        DashBoard / Home
      </span>
    </v-app-bar-title>
    <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat">
      <v-icon color="#bdbdbd" icon="mdi-cog-outline">
      </v-icon>
    </v-btn>
    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn v-bind="props" class="me-2 text-none rounded-xs custom-border" variant="flat">
          <v-icon class="mr-2" color="#bdbdbd" icon="mdi-clock-outline"></v-icon>
          <span style="color: #bdbdbd">{{ state.selectedLabel }}</span>
        </v-btn>
      </template>
      <v-list>
        <v-list-item v-for="(item, index) in state.timeOptions" :key="index" :value="item.value"
          @click="updateQuerySince(item.value)">
          <v-list-item-title>{{ item.label }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>
    <v-btn class="text-none rounded-xs custom-border" variant="flat" @click="fetchChartData">
      <v-icon color="#bdbdbd" icon="mdi-sync"></v-icon>
    </v-btn>
    <v-btn class="mx-2 text-none rounded-xs custom-border" color="indigo-darken-3" variant="flat" @click="applyChanges">
      Apply
    </v-btn>
    <v-btn class="me-2 text-none rounded-xs custom-border" color="red-darken-3" variant="flat" @click="discardChanges">
      Discard
    </v-btn>
  </v-app-bar>

  <v-container fluid>
    <v-row no-gutters>
      <v-col cols="9">
        <v-row no-gutters>
          <v-col cols="12 mb-10">
            <v-card ref="vCardRef" min-height="400" v-if="selectedChart" class="custom-border">
              <v-hover>
                <template v-slot:default="{ isHovering, props }">
                  <v-card :color="isHovering ? '#3c3c3c' : undefined" v-bind="props"
                    class="py-1 text-none rounded-xs text-center" variant="flat">
                    <span style="color: #bdbdbd">{{ selectedChart.options.chartTitle }}</span>
                  </v-card>
                </template>
              </v-hover>
              <Chart ref="chartComponentRef" class="no-drag" :chartOptions="selectedChart.options"
                :chartData="selectedChart.data"
                :key="selectedChart.id + '-' + selectedChart.options.width + '-' + selectedChart.options.height" />
            </v-card>
          </v-col>
          <v-col cols="12">
            <v-card class="custom-border">
              <v-textarea v-model="getQuery" class="code-editor" rows="10" hide-details variant="solo"
                bg-color="#121212" color="white" no-resize></v-textarea>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="3">
        <v-card min-height="800" class="ml-4 custom-border">
          <v-virtual-scroll class="scroll-container" :items="[1]" height="800px">
            <template v-slot:default>
              <v-expansion-panels v-model="panels" variant="accordion" multiple>
                <v-expansion-panel title='Panel Title' static>
                  <v-expansion-panel-text>
                    <v-text-field class="mt-2" v-model=getChartTitle @input="" variant="outlined"></v-text-field>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel title='Unit'>
                  <v-expansion-panel-text>
                    <v-text-field class="mt-2" v-model=getChartScale @input="" variant="outlined"></v-text-field>
                  </v-expansion-panel-text>
                </v-expansion-panel>

                <v-expansion-panel title='Standard Options'>
                  <v-expansion-panel-text>
                    <div class="d-flex justify-center">
                      <v-color-picker elevation="0" class="mt-4" v-model="getChartStrokeColor"></v-color-picker>
                    </div>
                    <v-card-text>
                      <v-slider v-model="fillOpacity" :max="1" :min="0" :step="0.1" class="ma-4" label="Fill opacity"
                        hide-details>
                        <template v-slot:append>
                          <v-text-field v-model="fillOpacity" density="compact" :max="1" :min="0" :step="0.1"
                            style="width: 80px" type="number" variant="outlined" hide-details></v-text-field>
                        </template>
                      </v-slider>
                    </v-card-text>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </template>
          </v-virtual-scroll>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, ref, reactive, nextTick, computed, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Chart from '@/components/dashboard/Chart.vue';
import influxdbDataService from '@/services/influxdbDataService';
import { useDashboardStore } from '@/store/dashboardData';
import { useChart } from '@/composables/useChart';

const dashboardStore = useDashboardStore();

const vCardRef = ref(null);
const chartComponentRef = ref(null);

const router = useRouter();
const route = useRoute();
const charts = reactive([]); // Armazena todos os gráficos obtidos
const selectedChart = ref(null);
const originalQuery = ref(""); // Armazena a consulta original
const panels = ref([0, 1, 2]);
const fillOpacity = ref(0.1);

const { timeSince, timeRange, state, getFormatFunction } = useChart();

const goBack = () => {
  router.go(-1);
};

const updateChartsSize = () => {
  nextTick(() => {
    if (vCardRef.value && vCardRef.value.$el) {
      const rect = vCardRef.value.$el.getBoundingClientRect();
      if (selectedChart.value && selectedChart.value.options) {
        selectedChart.value.options.width = rect.width;
        selectedChart.value.options.height = rect.height;
      }
    } else {
      console.error('vCardRef is not available or $el is not accessible.');
    }
  });
};

const fetchChartData = async () => {
  const { query } = selectedChart.value;

  if (!query) {
    console.error(`Dados ausentes para o gráfico ${selectedChart.value.id}`);
  } else {
    try {
      const response = await influxdbDataService.getData({ query });
      const influxData = response.data;
      updateChartData(influxData, selectedChart.value);
    } catch (error) {
      console.error(`Erro ao buscar os dados do InfluxDB para o gráfico ${selectedChart.value.id}:`, error);
    }
  }
}

const updateChartData = (influxData, chart) => {
  const timestamps = influxData.map(data => Math.floor(+new Date(data._time) / 1000));
  const values = influxData.map(data => data._value);

  chart.data = [
    timestamps,
    values
  ];
};

const updateQueriesWithTimeRange = () => {
  const selectedOption = state.timeOptions.find(option => option.label === state.selectedLabel);

  if (selectedOption) {

    let { query } = selectedChart.value;

    // Removendo todos os parênteses extras no fim do 'now()' e garantindo que apenas um parêntese feche a função
    query = query.replace(/(\|> range\(start: )[^,]+(, stop: )[^)]*\)*\)/, `$1${selectedOption.value}$2now())`);

    // Substituição para 'aggregateWindow', adaptando o intervalo de agregação
    query = query.replace(/(\|> aggregateWindow\(every: )[^,]+(,)/, `$1${selectedOption.range}$2`);

    selectedChart.value.query = query;
    timeRange.value = selectedOption.range;
  }
};

const updateQuerySince = (value) => {
  timeSince.value = value;

  const selectedItem = state.timeOptions.find(item => item.value === value);
  if (selectedItem) {
    state.selectedLabel = selectedItem.label;
  }

  selectedChart.value.options = {
    ...selectedChart.value.options,
    series: [
      selectedChart.value.options.series[0],
      {
        ...selectedChart.value.options.series[1],
        points: {
          ...selectedChart.value.options.series[1].points,
          show: timeSince.value === '-5m',
        }
      }
    ]
  };

  updateQueriesWithTimeRange();
  fetchChartData();
};

const getQuery = computed({
  get() {
    return selectedChart.value ? selectedChart.value.query : '';
  },
  set(newValue) {
    if (selectedChart.value) {
      selectedChart.value.query = newValue;
    }
  }
});

const getChartTitle = computed({
  get() {
    return selectedChart.value ? selectedChart.value.options.chartTitle : '';
  },
  set(newValue) {
    if (dashboardStore.currentChart) {
      dashboardStore.currentChart.options.chartTitle = newValue;
    }
  }
});

const getChartScale = computed({
  get() {
    return selectedChart.value ? selectedChart.value.options.series[1].scale : '';
  },
  set(newValue) {
    if (dashboardStore.currentChart) {
      dashboardStore.currentChart.options.series[1].scale = newValue;
    }
  }
});

const getChartStrokeColor = computed({
  get() {
    return selectedChart.value ? selectedChart.value.options.series[1].stroke : '';
  },
  set(newValue) {
    if (dashboardStore.currentChart) {
      updateChartColors(newValue);      
    }
  }
});

const hexToRgb = (hex) => {
  // Remove o # se estiver presente
  hex = hex.replace(/^#/, '');

  // Verifica o comprimento da string hexadecimal
  if (hex.length !== 6 && hex.length !== 8) {
    throw new Error('Formato hexadecimal inválido');
  }

  // Converte os valores hexadecimais para decimais
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (hex.length === 8) {
    const a = parseInt(hex.substring(6, 8), 16) / 255;
    // Retorna a string no formato RGBA
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } else {
    // Retorna a string no formato RGB
    return `rgb(${r}, ${g}, ${b})`;
  }
};

const updateChartColors = (newColor) => {
  if (selectedChart.value) {
    selectedChart.value.options.series[1].stroke = hexToRgb(newColor);
    dashboardStore.currentChart.options.series[1].stroke = hexToRgb(newColor);

    selectedChart.value.options.series[1].points.fill = hexToRgb(newColor);
    dashboardStore.currentChart.options.series[1].points.fill = hexToRgb(newColor);

    let strokeColor = selectedChart.value.options.series[1].stroke;

    // Verifica se é rgba ou rgb e ajusta a opacidade
    if (strokeColor.startsWith('rgba')) {
      selectedChart.value.options.series[1].fill = strokeColor;
    } else {
      strokeColor = strokeColor.replace(/rgb\((\d+), (\d+), (\d+)\)/, `rgba($1, $2, $3, ${fillOpacity.value})`);
      selectedChart.value.options.series[1].fill = strokeColor;
      
    }

    selectedChart.value.options.series[1].fill = strokeColor;
    dashboardStore.currentChart.options.series[1].fill = strokeColor;    
    selectedChart.value = JSON.parse(JSON.stringify(selectedChart.value));
  }
};

const updateChartFill = (newOpacity) => {
  if (selectedChart.value) {
    const limitedOpacity = Math.min(Math.max(newOpacity, 0), 1); // Garante que o valor esteja entre 0 e 1
    let strokeColor = selectedChart.value.options.series[1].stroke;

    // Verifica se é rgba ou rgb e ajusta a opacidade
    if (strokeColor.startsWith('rgba')) {
      strokeColor = strokeColor.replace(/rgba\((\d+), (\d+), (\d+), ([^)]+)\)/, `rgba($1, $2, $3, ${limitedOpacity})`);
    } else {
      strokeColor = strokeColor.replace(/rgb\((\d+), (\d+), (\d+)\)/, `rgba($1, $2, $3, ${limitedOpacity})`);
    }

    selectedChart.value.options.series[1].fill = strokeColor;
    dashboardStore.currentChart.options.series[1].fill = strokeColor;
    selectedChart.value = JSON.parse(JSON.stringify(selectedChart.value));
  }
};

watch(fillOpacity, (newValue) => {
  updateChartFill(newValue);
});

const applyChanges = () => {
  if (selectedChart.value) {
    selectedChart.value.query = getQuery.value; // Salva diretamente a consulta do textarea no chart selecionado
    console.log("Query applied:", selectedChart.value.query); // Debugging
  }
};

const discardChanges = () => {
  if (selectedChart.value) {
    selectedChart.value.query = originalQuery.value; // Restaura a consulta original
  }
};

const loadDashboard = async () => {
  const chartId = route.params.id;

  // Limpa o array reativo para evitar duplicação ao recarregar os dados
  charts.splice(0, charts.length);
  try {
    // Primeiro tenta carregar do useDashboardStore
    let storedDashboard = dashboardStore.getDashboard();
    if (storedDashboard && storedDashboard.length > 0) {
      charts.push(...storedDashboard);
      console.log("Carregado do useDashboardStore");
    } else {
      // Se não encontrar no store, tenta carregar do localStorage
      console.log("Carregando do localStorage");
      const storedDashboard = localStorage.getItem('tomatoesDashboard');
      if (storedDashboard) {
        const storedData = JSON.parse(storedDashboard);
        storedData.forEach(chartObject => {
          if (chartObject.options && chartObject.options.axes && chartObject.options.axes[1] && chartObject.options.axes[1].scale) {
            const formatFunction = getFormatFunction(chartObject.options.axes[1].scale);
            chartObject.options.axes[1].values = formatFunction;
          }
          charts.push(chartObject);
        });
        dashboardStore.setDashboard([...charts]);
      } else {
        // Carregar gráficos do backend
        console.log("Carregando do backend");
        const response = await dashboardDataService.getcharts();
        if (response && response.data) {
          response.data.forEach(chartObject => {
            // Se o objeto chart tiver um campo scale, ajuste a função values de acordo com o scale
            if (chartObject.options && chartObject.options.axes && chartObject.options.axes[1] && chartObject.options.axes[1].scale) {
              const formatFunction = getFormatFunction(chartObject.options.axes[1].scale);
              chartObject.options.axes[1].values = formatFunction;
            }

            charts.push(chartObject); // Só consegui fazer funcionar com push
          });
          // Salvar os dados no store
          dashboardStore.setDashboard([...charts]);
          localStorage.setItem('tomatoesDashboard', JSON.stringify(dashboardStore.dashboard));
        }
      }
    }
    // Define o gráfico selecionado com base no ID passado pela rota
    selectedChart.value = charts.find(c => c.id === Number(chartId));
    if (!selectedChart.value) {
      console.error("Chart not found");
    }
  } catch (error) {
    console.error("Error parsing chart data from localStorage:", error);
  }
};

onMounted(async () => {
  await loadDashboard();
  updateChartsSize();
  updateQuerySince(timeSince.value);
});
</script>

<style scoped>
.code-editor ::v-deep textarea {
  font-family: 'Consolas', monospace;
  font-size: 14px;
}

.scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
}

.scroll-container::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}

.scroll-container::-webkit-scrollbar-thumb {
  background-color: #3c3c3c;
  border-radius: 4px;
}

.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}
</style>
