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
            <v-card ref="chartCardRef" min-height="300" v-if="selectedChart" class="custom-border">
              <v-hover>
                <template v-slot:default="{ isHovering, props }">
                  <v-card :color="isHovering ? '#3c3c3c' : undefined" v-bind="props"
                    class="py-1 text-none rounded-xs text-center" variant="flat">
                    <span style="color: #bdbdbd">{{ selectedChart.options.chartTitle }}</span>
                  </v-card>
                </template>
              </v-hover>
              <Chart ref="chartCardRef" class="no-drag" :chartOptions="selectedChart.options"
                :chartData="selectedChart.data"
                :key="selectedChart.id + '-' + selectedChart.options.width + '-' + selectedChart.options.height" />
            </v-card>
          </v-col>
          <v-col cols="12">
            <v-card min-height="300" class="custom-border">
              <v-textarea v-model="getQuery" class="code-editor" rows="10" hide-details outlined bg-color="#121212"
                color="white" no-resize></v-textarea>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="3">
        <v-card min-height="800" class="ml-4 custom-border">
          <div>
            <v-expansion-panels v-model="panels" multiple>
              <v-expansion-panel title='Panel Title'>
                <v-expansion-panel-text>
                  <v-text-field v-model=getChartTitle @input=""></v-text-field>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel title='Standard Options'>
                <v-expansion-panel-text>
                  Some content
                </v-expansion-panel-text>
              </v-expansion-panel>

              <v-expansion-panel title='Standard Options'>
                <v-expansion-panel-text>
                  <v-color-picker v-model=getchartColor @input=""></v-color-picker>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { onMounted, ref, reactive, nextTick, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Chart from '@/components/dashboard/Chart.vue';
import influxdbDataService from '@/services/influxdbDataService';

const router = useRouter();
const route = useRoute();
const charts = reactive([]); // Armazena todos os gráficos obtidos
const selectedChart = ref(null); // Mudar o backend e o servide do frontend para buscar somente um char em dashboardDataService
const chartCardRef = ref(null);
const originalQuery = ref(""); // Armazena a consulta original
const panels = ref([0, 1, 2]);

const timeSince = ref('-5m');
const timeRange = ref('500ms');

const state = reactive({
  draggable: true,
  resizable: true,
  index: 3,
  selectedLabel: '5 minutes',
  timeOptions: [
    { label: '5 minutes', value: '-5m', range: '500ms' },
    { label: '15 minutes', value: '-15m', range: '1s' },
    { label: '30 minutes', value: '-30m', range: '2s' },
    { label: '1 hour', value: '-1h', range: '5s' },
    { label: '3 hours', value: '-3h', range: '20s' },
    { label: '6 hours', value: '-6h', range: '30s' },
    { label: '12 hours', value: '-12h', range: '1m' },
    { label: '24 hours', value: '-24h', range: '2m' },
    { label: '3 days', value: '-3d', range: '5m' },
    { label: '1 week', value: '-1w', range: '15m' },
  ],
});

const goBack = () => {
  router.go(-1);
};

const updateChartsSize = () => {
  nextTick(() => {
    if (chartCardRef.value && chartCardRef.value.$el) {
      const rect = chartCardRef.value.$el.getBoundingClientRect();
      if (selectedChart.value && selectedChart.value.options) {
        selectedChart.value.options.width = rect.width;
        selectedChart.value.options.height = rect.height;
      }
    } else {
      console.error('chartCardRef is not available or $el is not accessible.');
    }
  });
};

const fetchChartData = async () => {
  const { query } = selectedChart.value;

  if (!query) {
    console.error(`Dados ausentes para o gráfico ${selectedChart.value.id}`);
  }
  try {
    const response = await influxdbDataService.getData({ query });
    const influxData = response.data;
    updateChartData(influxData, selectedChart.value);
  } catch (error) {
    console.error(`Erro ao buscar os dados do InfluxDB para o gráfico ${selectedChart.value.id}:`, error);
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

const getFormatFunction = (scale) => {
  switch (scale) {
    case 'C':
      return (self, ticks) => ticks.map(rawValue => rawValue.toFixed(1) + "° C");
    case 'tds':
      // return (self, ticks) => ticks.map(rawValue => rawValue.toFixed(0) + "µS/cm");
      return (self, ticks) => ticks.map(rawValue => rawValue.toFixed(0) + "µS");
    case 'ph':
      return (self, ticks) => ticks.map(rawValue => rawValue.toFixed(1));
    case 'mb':
      return (self, ticks) => ticks.map(rawValue => (rawValue / 10 ** 6).toFixed(0) + "MB");
    case 'gb':
      return (self, ticks) => ticks.map(rawValue => (rawValue / 10 ** 9).toFixed(2) + "GB");
    default:
      return (self, ticks) => ticks.map(rawValue => rawValue.toFixed(2)); // formato padrão
  }
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
    if (selectedChart.value) {
      selectedChart.value.options.chartTitle = newValue;
    }
  }
});

const getchartColor = computed({
  get() {
    return selectedChart.value ? selectedChart.value.options.series[1].stroke : '';
  },
  set(newValue) {
    if (selectedChart.value) {
      selectedChart.value.options.series[1].stroke = newValue;
    }
  }
});

const updateChartTitle = () => {
  // Additional logic if needed upon title update
};

const updateChartColor = () => {
  // Additional logic if needed upon color update
};

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
  const chartId = route.params.id;  // Presume-se que o ID do gráfico seja passado via rota

  // Limpa o array reativo para evitar duplicação ao recarregar os dados
  charts.splice(0, charts.length);

  try {
    const storedData = localStorage.getItem('tomatoesDashboard');
    if (storedData) {
      const chartsData = JSON.parse(storedData);  // Parse os dados JSON salvos
      chartsData.forEach(chartObject => {
        // Se o objeto chart tiver um campo scale, ajuste a função values de acordo com o scale
        if (chartObject.options && chartObject.options.axes && chartObject.options.axes[1] && chartObject.options.axes[1].scale) {
          const formatFunction = getFormatFunction(chartObject.options.axes[1].scale);
          chartObject.options.axes[1].values = formatFunction;
        }
        charts.push(chartObject);  // Adiciona ao array reativo
      });

      // Define o gráfico selecionado com base no ID passado pela rota
      selectedChart.value = charts.find(c => c.id === Number(chartId));
      if (!selectedChart.value) {
        console.error("Chart not found");
      } else {
        // Armazena a consulta original quando o gráfico é carregado
        originalQuery.value = selectedChart.value.query;
      }
    } else {
      console.error("No dashboard data found in localStorage");
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
</style>
