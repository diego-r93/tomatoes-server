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
import { useDashboardStore } from '@/store/dashboardData';
import { useChart } from '@/composables/useChart';

const dashboardStore = useDashboardStore();

const router = useRouter();
const route = useRoute();
const charts = reactive([]); // Armazena todos os gráficos obtidos
const selectedChart = ref(null); // Mudar o backend e o servide do frontend para buscar somente um char em dashboardDataService
const chartCardRef = ref(null);

const intervalId = ref(null);

const { timeSince, timeRange, state, getFormatFunction } = useChart();

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

<style scoped></style>