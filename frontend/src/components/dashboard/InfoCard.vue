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

      <v-btn class="me-2 text-none rounded-xs" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-view-grid-plus">
        </v-icon>
      </v-btn>
      <v-btn class="me-2 text-none rounded-xs" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-content-save-outline">
        </v-icon>
      </v-btn>
      <v-btn class="me-2 text-none rounded-xs" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-cog-outline">
        </v-icon>
      </v-btn>

      <v-menu>
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" v-on="on" class="me-2 text-none rounded-xs" variant="flat">
            <v-icon class="mr-2" color="#bdbdbd" icon="mdi-clock-outline"></v-icon>
            <span style="color: #bdbdbd">{{ selectedLabel }}</span>
          </v-btn>
        </template>
        <v-list>
          <v-list-item v-for="(item, index) in timeOptions" :key="index" :value="item.value"
            @click="updateQueryRange(item.value)">
            <v-list-item-title>{{ item.label }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <div class="pr-5">
        <v-btn class="text-none rounded-xs" variant="flat" @click="fetchChartData">
          <v-icon color="#bdbdbd" icon="mdi-sync"></v-icon>
        </v-btn>
      </div>
    </v-app-bar>

    <grid-layout :layout="layout" @update:layout="layout = $event" :col-num="12" :row-height="30"
      :is-draggable="draggable" :is-resizable="resizable" :vertical-compact="true" :use-css-transforms="true">
      <grid-item v-for="item in layout" :key="item.i" :static="item.static" :x="item.x" :y="item.y" :w="item.w"
        :h="item.h" :i="item.i">
        <LineChart :data="chartData[item.i]" :options="chartOptions" />
      </grid-item>
    </grid-layout>

  </v-container>
</template>

<script>
import { reactive, ref, toRefs, onMounted } from 'vue';
import influxdbDataService from '@/services/influxdbDataService'
import { GridLayout, GridItem } from "vue-grid-layout"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line as LineChart } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

export default {
  components: {
    GridLayout,
    GridItem,
    LineChart
  },
  setup() {
    const chartData = ref({
      '0': {
        bucket: "tomatoes",
        query: "|> range(start: -5m) |> filter(fn: (r) => r._measurement == \"cpu_temperature\")",
        datasets: [{
          label: 'CPU Temperature',
          backgroundColor: '#5794F2',
          borderColor: '#5794F2',
          borderWidth: 1,
          fill: true,
        }]
      },
      '1': {
        bucket: "tomatoes",
        query: "|> range(start: -5m) |> filter(fn: (r) => r._measurement == \"cpu\") |> filter(fn: (r) => r[\"_field\"] == \"usage_user\") |> filter(fn: (r) => r[\"cpu\"] == \"cpu-total\")",
        datasets: [{
          label: 'CPU Usage',
          backgroundColor: '#FF6384',
          borderColor: '#FF6384',
          borderWidth: 1,
          fill: true,
        }]
      },
      '2': {
        bucket: "tomatoes",
        query: "|> range(start: -5m) |> filter(fn: (r) => r[\"_measurement\"] == \"mem\") |> filter(fn: (r) => r[\"_field\"] == \"used\")",
        datasets: [{
          label: 'RAM Usage',
          backgroundColor: '#FFCE56',
          borderColor: '#FFCE56',
          borderWidth: 1,
          fill: true,
        }]
      },
      '3': {
        bucket: "tomatoes",
        query: "|> range(start: -5m) |> filter(fn: (r) => r._measurement == \"cpu_temperature\")",
        datasets: [{
          label: 'pH',
          backgroundColor: '#36A2EB',
          borderColor: '#36A2EB',
          borderWidth: 1,
          fill: true,
        }]
      },
      '4': {
        bucket: "tomatoes",
        query: "|> range(start: -5m) |> filter(fn: (r) => r._measurement == \"cpu_temperature\")",
        datasets: [{
          label: 'Luminosity',
          backgroundColor: '#4BC0C0',
          borderColor: '#4BC0C0',
          borderWidth: 1,
          fill: true,
        }]
      },
    });
    const timeRange = ref('-5m');

    const state = reactive({
      draggable: true,
      resizable: true,
      index: 0,
      selectedLabel: '5min',
      timeOptions: [
        { label: '5 min', value: '-5m' },
        { label: '10 min', value: '-10m' },
        { label: '30 min', value: '-30m' },
        { label: '1 hour', value: '-1h' },
        { label: '3 hours', value: '-3h' },
      ],
      layout: [
        { "x": 0, "y": 0, "w": 4, "h": 8, "i": "0", static: false },
        { "x": 4, "y": 0, "w": 4, "h": 8, "i": "1", static: false },
        { "x": 8, "y": 0, "w": 4, "h": 8, "i": "2", static: false },
        { "x": 3, "y": 0, "w": 4, "h": 8, "i": "3", static: false },
        { "x": 7, "y": 0, "w": 4, "h": 8, "i": "4", static: false },
      ],

      chartOptions: {
        scales: {
          x: {
            ticks: {
              color: 'white'
            },
            grid: {
              color: '#3c3c3c'
            }
          },
          y: {
            border: {
              display: true,
            },
            ticks: {
              color: 'white',
            },
            grid: {
              color: '#3c3c3c'
            },
            beginAtZero: true,
          }
        },
        plugins: {
          legend: {
            position: 'top',
            align: 'center',
            labels: {
              font: {
                size: 12,
              },
              color: 'white'
            },
            padding: {
              top: 10,
              bottom: 10
            },
          },
        },
        elements: {
          point: {
            radius: 2
          }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });

    const fetchChartData = async () => {
      for (let chartIndex in chartData.value) {
        const bucket = chartData.value[chartIndex].bucket
        const query = chartData.value[chartIndex].query
        if (!bucket || !query) {
          console.error(`Dados ausentes para o gráfico ${chartIndex}`);
          continue;
        }
        try {
          const response = await influxdbDataService.getData({
            bucket,
            query
          });
          const influxData = response.data;
          updateChartData(influxData, chartIndex);
        } catch (error) {
          console.error(`Erro ao buscar os dados do InfluxDB para o gráfico ${chartIndex}:`, error);
        }
      }
    }

    const updateChartData = (influxData, chartIndex) => {
      const labels = influxData.map(data => new Date(data._time).toLocaleTimeString());
      const values = influxData.map(data => data._value);
      chartData.value[chartIndex] = {
        ...chartData.value[chartIndex],
        labels: labels,
        datasets: [{
          label: chartData.value[chartIndex].datasets[0].label,
          data: values,
        }]
      };
    }
    onMounted(() => {
      updateQueriesWithTimeRange();
      fetchChartData();
    });

    const updateQueriesWithTimeRange = () => {
      for (let chartIndex in chartData.value) {
        let query = chartData.value[chartIndex].query;
        query = query.replace(/(\|> range\(start: )[^\)]+\)/, `$1${timeRange.value})`);
        chartData.value[chartIndex].query = query;
      }
    };

    const updateQueryRange = (value) => {
      timeRange.value = value;

      if (value === '-5m') {
        state.chartOptions.elements.point.radius = 2;  // Mostra o ponto se for '-5m'
      } else {
        state.chartOptions.elements.point.radius = 0;  // Oculta o ponto para outros valores
      }
      updateQueriesWithTimeRange();
      fetchChartData();

      const selectedOption = state.timeOptions.find(item => item.value === value);
      if (selectedOption) {
        state.selectedLabel = selectedOption.label;
      }
    };

    return {
      ...toRefs(state),
      chartData,
      updateQueryRange,
      fetchChartData,

      itemTitle(item) {
        let result = item.i;
        if (item.static) {
          result += " - Static";
        }
        return result;
      },
    }
  },
}
</script>

<style>
.vue-grid-item:hover {
  opacity: 0.7;
}

.vue-grid-layout {
  background: #121212;
}

.vue-grid-item.vue-grid-placeholder {
  background: rgb(60, 190, 160);
}

.vue-grid-item:not(.vue-grid-placeholder) {
  background: #3f51b5;
  background: #212121;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
}

.vue-grid-item.resizing {
  opacity: 0.9;
}

.vue-grid-item.static {
  background: #cce;
}

.vue-grid-item .text {
  font-size: 24px;
  text-align: center;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  margin: auto;
  height: 100%;
  width: 100%;
}

.vue-grid-item .no-drag {
  height: 100%;
  width: 100%;
}

.vue-grid-item .minMax {
  font-size: 12px;
}

.vue-grid-item .add {
  cursor: pointer;
}

.canvas-wrapper {
  position: relative;
}

.canvas-wrapper::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.8));
  pointer-events: none;
}
</style>