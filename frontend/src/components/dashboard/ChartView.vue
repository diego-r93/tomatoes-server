<template>
  <v-container class="py-2 px-2" fill-height>
    <v-app-bar color="#121212" flat>
      <template v-slot:prepend>
        <v-btn density="compact" icon="mdi-arrow-left" size="large" color="#bdbdbd" @click="goBack"></v-btn>
      </template>
      <v-app-bar-title class="text-h6">
        <span style="color: #bdbdbd">
          Dashboard / View
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

      <div class="pr-3 pl-1">
        <v-menu>
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" class="me-2 text-none rounded-xs custom-border" variant="flat">
              <v-icon class="mr-2" color="#bdbdbd" icon="mdi-timer-outline"></v-icon>
              <span style="color: #bdbdbd">{{ state.selectedUpdateInterval }}</span>
            </v-btn>
          </template>
          <v-list>
            <v-list-item v-for="(timeOptions, index) in state.updateIntervals" :key="index" :value="timeOptions.value"
              @click="setUpdateInterval(timeOptions)">
              <v-list-item-title>{{ timeOptions.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-app-bar>

    <v-card ref="chartCardRef" min-height="700" v-if="selectedChart" class="custom-border">
      <v-hover>
        <template v-slot:default="{ isHovering, props }">
          <v-card :color="isHovering ? '#3c3c3c' : undefined" v-bind="props"
            class="py-1 text-none rounded-xs text-center" variant="flat">
            <span style="color: #bdbdbd">{{ selectedChart.options.chartTitle }}</span>
          </v-card>
        </template>
      </v-hover>
      <Chart ref="chartCardRef" class="no-drag" :chartOptions="selectedChart.options" :chartData="selectedChart.data"
        :key="selectedChart.id + '-' + selectedChart.options.width + '-' + selectedChart.options.height" />
    </v-card>
  </v-container>
</template>

<script setup>
import { onMounted, ref, reactive, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Chart from '@/components/dashboard/Chart.vue';
import influxdbDataService from '@/services/influxdbDataService';

const router = useRouter();
const route = useRoute();
const charts = reactive([]); // Armazena todos os gráficos obtidos
const selectedChart = ref(null); // Mudar o backend e o servide do frontend para buscar somente um char em dashboardDataService
const chartCardRef = ref(null);

const timeSince = ref('-5m');
const timeRange = ref('500ms');

const intervalId = ref(null);

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
  updateIntervals: [
    { label: 'Off', value: null },
    { label: '2s', value: '2s' },
    { label: '5s', value: '5s' },
    { label: '10s', value: '10s' },
    { label: '30s', value: '30s' },
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '30m', value: '30m' },
    { label: '1h', value: '1h' },
    { label: '2h', value: '2h' },
    { label: '6h', value: '6h' },
  ],
  selectedUpdateInterval: 'Off',
  intervalId: null,
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

const setUpdateInterval = (intervalOption) => {
  state.selectedUpdateInterval = intervalOption.label; // Atualizar o rótulo selecionado

  // Limpa qualquer intervalo existente
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }

  // Configura um novo intervalo se o valor for diferente de 'null'
  if (intervalOption.value) {
    const intervalTime = parseInterval(intervalOption.value);
    intervalId.value = setInterval(fetchChartData, intervalTime);
  } else {
    // Se "Off" for selecionado, certifique-se de que não há intervalos ativos
    if (intervalId.value) {
      clearInterval(intervalId.value);
    }
  }
};

const parseInterval = (intervalString) => {
  if (!intervalString) return 0;
  const units = {
    's': 1000,
    'm': 60000,
    'h': 3600000,
  };
  const unit = intervalString.slice(-1);
  const time = parseInt(intervalString.slice(0, -1));
  return time * (units[unit] || 0);
};

const loadDashboard = async () => {
  const chartId = route.params.id;

  // Limpa o array reativo para evitar duplicação ao recarregar os dados
  charts.splice(0, charts.length);
  try {
    const storedData = localStorage.getItem('TomatoesDashboard');
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

<style scoped></style>