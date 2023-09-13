<template>
  <v-container class="py-2 px-2" fluid>

    <v-app-bar color="#121212" flat>

      <template v-slot:prepend>
        <v-icon icon="mdi-view-dashboard" size="small"></v-icon>
      </template>

      <v-app-bar-title class="text-h6">DashBoard / Home</v-app-bar-title>

      <v-spacer></v-spacer>
      <v-btn class="me-1 text-none rounded-xs" size="small" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-view-grid-plus">
        </v-icon>
      </v-btn>
      <v-btn class="me-1 text-none rounded-xs" size="small" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-content-save-outline">
        </v-icon>
      </v-btn>
      <v-btn class="me-1 text-none rounded-xs" size="small" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-cog-outline">
        </v-icon>
      </v-btn>
      <v-btn class="me-1 text-none rounded-xs" size="small" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-clock-outline">
        </v-icon>
      </v-btn>
      <v-btn class="me-1 text-none rounded-xs" size="small" variant="flat">
        <v-icon color="#bdbdbd" icon="mdi-update">
        </v-icon>
      </v-btn>
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
import mqttDataService from '@/services/influxdbDataService'
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
  mounted() {
    this.fetchChartData();
  },
  data() {
    return {
      layout: [
        { "x": 0, "y": 0, "w": 4, "h": 8, "i": "0", static: false },
        { "x": 4, "y": 0, "w": 4, "h": 8, "i": "1", static: false },
        { "x": 4, "y": 0, "w": 3, "h": 6, "i": "2", static: false },
        { "x": 7, "y": 0, "w": 4, "h": 8, "i": "3", static: false },
        { "x": 8, "y": 0, "w": 3, "h": 6, "i": "4", static: false },
      ],
      draggable: true,
      resizable: true,
      index: 0,
      chartData: {
        '0': {
          labels: ['00:00:00', '01:00:00', '02:00:00', '03:00:00', '04:00:00', '05:00:00'],
          datasets: [{
            label: 'Data One',
            data: [40, 39, 10, 40, 39, 80],
            backgroundColor: '#5794F2',
            borderColor: '#5794F2',
            borderWidth: 1,
            fill: true,
          }]
        },
        '1': {
          labels: ['00:00:00', '01:00:00', '02:00:00', '03:00:00', '04:00:00', '05:00:00'],
          datasets: [{
            label: 'Temperature',
            data: [23, 25, 22, 21, 20, 19],
            backgroundColor: '#FF6384',
            borderColor: '#FF6384',
            borderWidth: 1,
            fill: true,
          }]
        },
        '2': {
          labels: ['00:00:00', '01:00:00', '02:00:00', '03:00:00', '04:00:00', '05:00:00'],
          datasets: [{
            label: 'Humidity',
            data: [45, 50, 55, 60, 65, 70],
            backgroundColor: '#FFCE56',
            borderColor: '#FFCE56',
            borderWidth: 1,
            fill: true,
          }]
        },
        '3': {
          labels: ['00:00:00', '01:00:00', '02:00:00', '03:00:00', '04:00:00', '05:00:00'],
          datasets: [{
            label: 'pH',
            data: [6.8, 7.0, 6.7, 6.5, 6.4, 6.3],
            backgroundColor: '#36A2EB',
            borderColor: '#36A2EB',
            borderWidth: 1,
            fill: true,
          }]
        },
        '4': {
          labels: ['00:00:00', '01:00:00', '02:00:00', '03:00:00', '04:00:00', '05:00:00'],
          datasets: [{
            label: 'Luminosity',
            data: [1000, 1100, 1050, 1200, 1300, 1400],
            backgroundColor: '#4BC0C0',
            borderColor: '#4BC0C0',
            borderWidth: 1,
            fill: true,
          }]
        },
      },
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
        responsive: true,
        maintainAspectRatio: false
      }
    }
  },
  methods: {
    itemTitle(item) {
      let result = item.i;
      if (item.static) {
        result += " - Static";
      }
      return result;
    },
    async fetchChartData() {
      try {
        const response = await mqttDataService.getData();
        const influxData = response.data;
        this.updateChartData(influxData);
      } catch (error) {
        console.error("Erro ao buscar os dados do InfluxDB:", error);
      }
    },
    updateChartData(influxData) {
      const labels = influxData.map(data => new Date(data._time).toLocaleTimeString());
      const values = influxData.map(data => data._value);

      this.chartData['0'] = {
        labels: labels,
        datasets: [{
          label: 'CPU Temperature',
          data: values,
          backgroundColor: '#5794F2',
          borderColor: '#5794F2',
          borderWidth: 1,
          fill: true,
        }]
      };
    }
  }
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
</style>