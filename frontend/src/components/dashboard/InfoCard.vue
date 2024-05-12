<template>
  <v-container class="py-2 px-2" fluid>
    <v-app-bar color="#121212" flat>

      <template v-slot:prepend>
        <v-icon color="#bdbdbd" icon="mdi-view-dashboard" size="small"></v-icon>
      </template>

      <v-app-bar-title class="text-h6">
        <span style="color: #bdbdbd">
          DashBoard / Home
        </span>
      </v-app-bar-title>

      <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat" @click="addPlaceHolder">
        <v-icon color="#bdbdbd" icon="mdi-view-grid-plus" size="small">
        </v-icon>
      </v-btn>

      <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat" @click="confirmSaveDashboard">
        <v-icon color="#bdbdbd" icon="mdi-content-save-outline">
        </v-icon>
      </v-btn>
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
            <v-list-item v-for="(timeOption, index) in state.updateIntervals" :key="index" :value="timeOption.value"
              @click="setUpdateInterval(timeOption)">
              <v-list-item-title>{{ timeOption.label }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-app-bar>

    <grid-layout :layout="layout" @update:modelValue="updateLayout" :col-num="12" :row-height="30"
      :is-draggable="draggable" :is-resizable="resizable" :vertical-compact="true" :use-css-transforms="true">

      <grid-item v-for="chart in layout" :key="chart.i" :x="chart.x" :y="chart.y" :w="chart.w" :h="chart.h" :i="chart.i"
        :ref="el => registerRef(Number(chart.i), el)" drag-ignore-from=".no-drag"
        :class="Number(chart.i) === charts.length && placeholderVisible ? 'new-chart-border' : 'custom-border'">

        <!-- Se for o ID do novo item placeholder, mostre o card "Add New Chart to Panel" -->
        <template v-if="Number(chart.i) === charts.length && placeholderVisible">
          <v-hover>
            <template v-slot:default="{ isHovering, props }">
              <v-card :color="isHovering ? '#3c3c3c' : undefined" v-bind="props" class="py-1 text-none rounded-xs"
                variant="flat">
                <v-row no-gutters>
                  <v-col cols="11" class="pl-4 d-flex justify-start align-center">
                    <v-icon color="#bdbdbd" icon="mdi-view-grid-plus"></v-icon>
                    <span class="pl-2" style="color: #bdbdbd">Add Panel</span>
                  </v-col>
                  <v-col cols="1" class="d-flex justify-end">
                    <v-btn @click="removePlaceHolder(chart.i)" icon size="x-small" variant="text">
                      <v-icon color="#bdbdbd">mdi-close</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-card>
            </template>
          </v-hover>
          <v-container class="my-container d-flex justify-center align-center no-drag">
            <v-btn variant="flat" @click="addItem">
              <v-icon color="#bdbdbd" icon="mdi-chart-areaspline-variant"></v-icon>
              <span class="ml-2" style="color: #bdbdbd">Add New Chart to Panel</span>
            </v-btn>
          </v-container>
        </template>

        <!-- Se não, mostre o gráfico existente -->
        <template v-else-if="getChartById(chart.i)">
          <div @mousedown="mouseDownHandler(chart.i, $event)" @mouseup="mouseUpHandler(chart.i)">
            <v-hover>
              <template v-slot:default="{ isHovering, props }">
                <v-card :color="isHovering ? '#3c3c3c' : undefined" v-bind="props"
                  class="py-1 text-none text-center rounded-md" variant="flat">
                  <span style="color: #bdbdbd">{{ getChartById(chart.i).options.chartTitle }}</span>
                </v-card>
              </template>
            </v-hover>
          </div>
          <div class="d-flex justify-center">
            <v-card class="position-absolute dropdown-list" :class="['elevation-15']"
              v-show="listVisibility[chart.i]">
              <v-list density="compact">
                <template v-for="(item, index) in listItems" :key="index">
                  <v-divider v-if="item.type === 'divider'"></v-divider>
                  <v-list-item v-if="item.title && !item.type" :value="item.value"
                    @click="handleItemClick(item, chart.i)">
                    <template v-slot:prepend>
                      <v-icon size="x-small" v-if="item.icon">{{ item.icon }}</v-icon>
                    </template>
                    <v-list-item-content>
                      <v-list-item-title class="dropdown-text mx-0">{{ item.title }}</v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>
                </template>
              </v-list>
            </v-card>
          </div>          
            <Chart class="no-drag" :chartOptions="getChartById(chart.i).options" :chartData="getChartById(chart.i).data"
              :key="chart.i + '-' + getChartById(chart.i).options.width + '-' + getChartById(chart.i).options.height" />
        </template>
      </grid-item>
    </grid-layout>
  </v-container>

  <v-dialog v-model="showSaveDialog" persistent max-width="340px">
    <v-card>
      <v-card-title class="headline">Save Dashboard</v-card-title>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="green darken-1" text @click="saveDashboard">
          Save
        </v-btn>
        <v-btn color="red darken-1" text @click="showSaveDialog = false">
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { reactive, ref, onMounted, nextTick, watch } from 'vue'
import { GridLayout, GridItem } from "grid-layout-plus"
import Chart from '@/components/dashboard/Chart.vue'
import { useRouter } from 'vue-router'
import influxdbDataService from '@/services/influxdbDataService'
import dashboardDataService from '@/services/dashboardDataService'
import { useDashboardStore } from '@/store/dashboardData';

const dashboardStore = useDashboardStore();

const router = useRouter()

const gridItemsRefs = ref({});
const charts = reactive([]);
let layout = ref([]);
let index = ref([]);

const timeSince = ref('-5m');
const timeRange = ref('500ms');

const intervalId = ref(null);

const placeholderAdded = ref(false);
const placeholderVisible = ref(false);

const showSaveDialog = ref(false);
const hasChanges = ref(false);

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

// Estado reativo para controlar a visibilidade das listas
const listVisibility = reactive({});
const mouseDownTime = ref(null);
const dragging = ref(false);

// Dados da lista
const listItems = [
  { title: 'View', icon: 'mdi mdi-eye-outline', value: 1, method: 'navigateToView' },
  { title: 'Edit', icon: 'mdi-view-dashboard-edit-outline', value: 2, method: 'navigateToEdit' },
  { type: 'divider' },
  { title: 'Remove', icon: 'mdi mdi-trash-can-outline', value: 3, method: 'removeItem' },
];

function mouseDownHandler(chartId, event) {
  event.preventDefault(); // Impede ações padrões, como a seleção de texto
  mouseDownTime.value = Date.now(); // Registra o momento do clique
  dragging.value = false; // Inicializa como não arrastando
}

function mouseUpHandler(chartId) {
  const clickDuration = Date.now() - mouseDownTime.value;
  if (clickDuration < 200) { // Considera um clique rápido se for menos de 200ms
    toggleListVisibility(chartId);
  }
}

// Função para alternar a visibilidade
const toggleListVisibility = (chartId) => {
  if (listVisibility[chartId] !== undefined) {
    listVisibility[chartId] = !listVisibility[chartId];
  } else {
    // Se não existir, inicializa como true (se é a primeira vez que clica, mostra a lista)
    listVisibility[chartId] = true;
  }
};

// Método para registrar os elementos DOM dos grid-items.
const registerRef = (id, el) => {
  if (el?.$el) {
    // Se el for um componente Vue, registre seu elemento raiz.
    gridItemsRefs.value[id] = el.$el;
  } else {
    gridItemsRefs.value[id] = el;
  }
  updateChartsSize();
};

// Método para obter o tamanho do grid-item pelo ID.
const getChartSize = (id) => {
  const gridItem = gridItemsRefs.value[id];
  if (gridItem) {
    return {
      width: gridItem.clientWidth,
      height: gridItem.clientHeight,
    };
  }
  return { width: 300, height: 300 }; // Padrão
};

// Método para atualizar o tamanho de todos os charts.
const updateChartsSize = () => {
  charts.forEach(chart => {
    const size = getChartSize(chart.id);
    const titleHeight = 20;
    const xAxisHeight = 50;
    const legendHeight = 31;
    chart.options.width = size.width;
    chart.options.height = size.height - xAxisHeight - legendHeight + titleHeight;
  });
  // hasChanges.value = true;
};

const fetchChartData = async () => {
  for (let chart of charts) {
    const { query } = chart;
    if (!query) {
      console.error(`Dados ausentes para o gráfico ${chart.width}`);
      continue;
    }
    try {
      const response = await influxdbDataService.getData({ query });
      const influxData = response.data;
      updateChartData(influxData, chart);
    } catch (error) {
      console.error(`Erro ao buscar os dados do InfluxDB para o gráfico ${chart.id}:`, error);
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
    for (let chart of charts) {
      let query = chart.query;

      // Removendo todos os parênteses extras no fim do 'now()' e garantindo que apenas um parêntese feche a função
      query = query.replace(/(\|> range\(start: )[^,]+(, stop: )[^)]*\)*\)/, `$1${selectedOption.value}$2now())`);

      // Substituição para 'aggregateWindow', adaptando o intervalo de agregação
      query = query.replace(/(\|> aggregateWindow\(every: )[^,]+(,)/, `$1${selectedOption.range}$2`);

      chart.query = query;
      timeRange.value = selectedOption.range;
    }
  }
};

const updateQuerySince = (value) => {
  timeSince.value = value;

  const selectedItem = state.timeOptions.find(item => item.value === value);
  if (selectedItem) {
    state.selectedLabel = selectedItem.label;
  }

  for (let chart of charts) {
    chart.options = {
      ...chart.options,
      series: [
        chart.options.series[0],
        {
          ...chart.options.series[1],
          points: {
            ...chart.options.series[1].points,
            show: timeSince.value === '-5m',
          }
        }
      ]
    };
  }
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

const updateLayout = (newLayout) => {
  newLayout.forEach((layoutItem) => {
    const chart = charts.find(c => c.id.toString() === layoutItem.i);
    if (chart) chart.layout = layoutItem;
  });
  // hasChanges.value = true;
};

const getChartById = (id) => {
  return charts.find(c => c.id === Number(id));
};

const addPlaceHolder = () => {
  if (!placeholderAdded.value) {
    const newId = charts.length;

    // Criar um novo objeto de layout
    const newLayout = {
      x: 0,
      y: 0,
      w: 6,
      h: 8,
      i: newId.toString(),
    };

    layout.value.forEach(item => {
      if (item.y >= newLayout.y) {
        item.y += newLayout.h;
      }
    });

    layout.value.push(newLayout);

    index.value++;

    nextTick(() => {
      updateChartsSize();
    });

    placeholderAdded.value = true;
    placeholderVisible.value = true;
    hasChanges.value = true;
  } else {
    return;
  }
};

const removePlaceHolder = (id) => {
  const idNum = Number(id);

  // Verifique se o ID corresponde ao ID do placeholder
  if (idNum === charts.length) {
    // Encontre o item do placeholder
    const placeholderItem = layout.value.find(item => Number(item.i) === idNum);

    // Se o item do placeholder não foi encontrado, retorne (para evitar erros)
    if (!placeholderItem) return;

    // Pegue a altura e a posição y do placeholder
    const { h: placeholderHeight, y: placeholderY } = placeholderItem;

    // Remova o placeholder do layout
    layout.value = layout.value.filter(item => Number(item.i) !== idNum);

    // Ajuste a posição y de todos os itens do grid que foram movidos por causa do placeholder
    layout.value.forEach(item => {
      if (item.y > placeholderY) {
        item.y -= placeholderHeight;
      }
    });

    placeholderAdded.value = false;
    placeholderVisible.value = false;
    hasChanges.value = false;
  }
};

const addItem = () => {
  const newId = charts.length;

  // Encontre o placeholder no layout
  const placeholderLayout = layout.value.find(item => Number(item.i) === newId);

  // Se não encontrarmos um placeholder, não faça nada
  if (!placeholderLayout) return;

  // Adicionar novo chart com o novo layout
  charts.push({
    id: newId,
    draggable: false,    
    options: {
      chartTitle: "Chart Title",
      series: [
        {
          label: "Date"
        },
        {
          label: "",
          scale: "",
          points: {
            show: true,
            fill: "rgb(87, 148, 242)"
          },
          stroke: "rgb(87, 148, 242)",
          fill: "rgba(87, 148, 242, 0.1)"
        }
      ],
      sales: {
        x: {
          time: true
        },
        y: {
          auto: true,
          range: []
        },
      },
      axes: [
      {
          stroke: "#bdbdbd",
          grid: {
            "stroke": "#2C3033",
            "width": 1
          }
        },
        {
          scale: "",
          stroke: "#bdbdbd",
          grid: {
            "stroke": "#2C3033",
            "width": 1
          }
        }
      ],
    },
    data: [],
    layout: placeholderLayout,  // use o layout existente do placeholder
    query: "",
  });

  // Atualiza o estado do store e salva no localStorage
  dashboardStore.setDashboard([...charts]);
  localStorage.setItem('tomatoesDashboard', JSON.stringify(charts));

  nextTick(() => {
    updateChartsSize();
  });

  placeholderAdded.value = false;
  placeholderVisible.value = false;
  hasChanges.value = true;
};

const removeItem = (id) => {
  // Certifique-se de que o ID seja um número, já que os IDs nos objetos de layout são strings
  const numericId = Number(id);

  // Encontrar o índice do gráfico com o ID correspondente
  const chartIndex = charts.findIndex(chart => chart.id === numericId);
  if (chartIndex === -1) {
    console.error(`Gráfico com ID ${id} não encontrado.`);
    return; // Se não encontrar o gráfico, retorna e não faz nada
  }
  // Remove o gráfico do array de gráficos
  charts.splice(chartIndex, 1);
  // Remove o item de layout correspondente
  layout.value = layout.value.filter(item => Number(item.i) !== numericId);

  hasChanges.value = true;
};

const navigateToView = (chartId) => {
  const chart = charts.find(c => c.id === Number(chartId));
  dashboardStore.setCurrentChart(chart);
  router.push({ path: `/dashboard/viewPanel/${chartId}` });
};

const navigateToEdit = (chartId) => {
  const chart = charts.find(c => c.id === Number(chartId));
  dashboardStore.setCurrentChart(chart);
  router.push({ path: `/dashboard/editPanel/${chartId}` });
};

// Objeto para mapear nomes de métodos para funções
const methods = {
  navigateToView,
  navigateToEdit,
  removeItem
};

const handleItemClick = (item, chartId) => {
  if (item.method && typeof methods[item.method] === 'function') {
    methods[item.method](chartId);
  } else {
    console.error(`Method ${item.method} is not a function`);
  }
};

const confirmSaveDashboard = () => {
  showSaveDialog.value = true;
};

// Função para generalizar a query no JSON
const prepareQueryForSave = (query) => {
  // Substituir a parte de range para usar variáveis
  query = query.replace(/\|> range\(start: [^,]+(, stop: [^)]+)?\)/, '|> range(start: v.timeRangeStart, stop: v.timeRangeStop');

  // Substituir a parte de aggregateWindow para usar a variável windowPeriod
  query = query.replace(/\|> aggregateWindow\(every: [^,]+,/, '|> aggregateWindow(every: v.windowPeriod,');

  return query;
};

const saveDashboard = async () => {

  showSaveDialog.value = false;

  try {
    if (!charts) {
      console.error("charts.value é undefined");
      return;
    }

    // Criar uma cópia profunda do charts.value
    let chartsCopy = JSON.parse(JSON.stringify(charts));

    // Ajustar a query para ser genérica e limpar o campo data de cada objeto em chartsCopy
    chartsCopy.forEach(chart => {
      chart.data = []; // Limpar os dados
      chart.query = prepareQueryForSave(chart.query); // Generalizar a query antes de salvar
    });

    // Ajustar o campo data de cada objeto em chartsCopy para ser um array vazio
    chartsCopy.forEach(chart => {
      chart.data = [];
    });

    const chartsJSON = JSON.stringify(chartsCopy);

    if (chartsJSON.includes("undefined")) {
      console.error("A string chartsJSON contém 'undefined':", chartsJSON);
      return;
    }

    const response = await dashboardDataService.saveCharts(chartsJSON);
    if (response && response.status === 200) {
      console.log('Gráficos salvos com sucesso!');
    } else {
      console.error("Erro ao salvar os gráficos:", response);
    }
  } catch (error) {
    console.error("Erro ao salvar os gráficos:", error);
  }

  hasChanges.value = false;
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

watch(charts, (newCharts) => {
  newCharts.forEach(chart => {
    if (listVisibility[chart.id] === undefined) {
      listVisibility[chart.id] = false;
    }
  });
}, { deep: true, immediate: true });

const loadDashboard = async () => {
  if (intervalId.value) {
    clearInterval(intervalId.value);
  }

  // Carregar gráficos do backend
  try {
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
      
      // Após salvar no store, imprimir o que foi salvo no localStorage
      // console.log("Dados salvos no localStorage:", JSON.parse(localStorage.getItem('tomatoesDashboard')));
      // console.log("Dados salvos no store:", dashboardStore.dashboard);
    }
  } catch (error) {
    console.error("Erro ao carregar os gráficos:", error);
  }
};

onMounted(async () => {
  await loadDashboard()

  updateQuerySince(timeSince.value);
  fetchChartData();

  layout.value = charts.map(chart => chart.layout);
  index.value = layout.value.length;

  window.addEventListener('resize', () => {
    updateChartsSize();
    updateQueriesWithTimeRange();
  });

  window.onbeforeunload = function (event) {
    if (hasChanges.value) {
      // Mensagem para o usuário
      const confirmationMessage = "É possível que as alterações não sejam salvas. Você realmente deseja recarregar a página?";

      // Padrão para alguns navegadores
      event.returnValue = confirmationMessage;

      return confirmationMessage;
    }
  };
});
</script>

<style scoped>
.vgl-layout {
  --vgl-placeholder-bg: rgb(60, 190, 160);
  background-color: #121212;
}

.vgl-item {
  background: #212121;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
}

.new-chart-border {
  border: 2px solid #03dac6 !important;
}

.my-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 88%;
}

.dropdown-list {
  z-index: 10;
}

.dropdown-text {
  font-size: 12px;
}
</style>