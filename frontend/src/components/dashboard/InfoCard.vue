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
          <v-btn v-bind="props" class="me-2 text-none rounded-xs" variant="flat">
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
      <grid-item v-for="chart in charts" :key="chart.id" :x="chart.layout.x" :y="chart.layout.y" :w="chart.layout.w"
        :h="chart.layout.h" :i="chart.id.toString()" :ref="el => registerRef(chart.id, el)">
        <Chart :chartOptions="chart.options" :chartData="chart.data"
          :key="chart.id + '-' + chart.options.width + '-' + chart.options.height" />
      </grid-item>
    </grid-layout>

  </v-container>
</template>

<script>
import { reactive, ref, toRefs, onMounted } from 'vue'
import { GridLayout, GridItem } from "vue-grid-layout"
import Chart from '@/components/dashboard/Chart.vue'
import influxdbDataService from '@/services/influxdbDataService'

export default {
  components: { GridLayout, GridItem, Chart },
  setup() {
    const gridItemsRefs = ref({});
    const timeRange = ref('-5m');

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
      charts.value.forEach(chart => {
        const size = getChartSize(chart.id);
        // Aqui, atualize as dimensões do componente Chart conforme necessário.
        // Se o componente Chart tem um método ou propriedades para atualizar
        // seu tamanho, você pode chamar ou modificar aqui.

        // Subtrair o espaço necessário para outras divs aqui
        const titleHeight = 27;
        const xAxisHeight = 50;
        const legendHeight = 31;
        chart.options.width = size.width;
        chart.options.height = size.height - xAxisHeight - legendHeight + titleHeight;
      });
    };

    const charts = ref([
      {
        id: 0,
        options: {
          title: "cpu_temperature", ...getChartSize(0),
          padding: [null, null, null, 15],
          series: [
            {
              label: "Date",
            },
            {
              label: "",
              scale: "C",
              points: {
                show: true,
                fill: "rgb(255, 152, 48)",
              },
              stroke: "rgb(255, 152, 48)",
              fill: "rgba(255, 152, 48, 0.1)",
            },
          ],
          scales: {
            x: { time: true },
            y: {
              auto: true,
              range: [],
            },
          },
          axes: [
            {
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
            {
              scale: "C",
              values: (self, ticks) => ticks.map(rawValue => (rawValue / 1000).toFixed(2) + "° C"),
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
          ],
        },
        data: [],
        layout: { x: 0, y: 0, w: 6, h: 10, i: "0" },
        bucket: "tomatoes",
        query: "|> range(start: -5m) |> filter(fn: (r) => r._measurement == \"cpu_temperature\")",
      },
      {
        id: 1,
        options: {
          title: "cpu_total", ...getChartSize(1),
          series: [
            {
              label: "Date",
            },
            {
              label: "",
              points: {
                show: true,
                fill: "rgb(87, 148, 242)",
              },
              stroke: "rgb(87, 148, 242)",
              fill: "rgba(87, 148, 242, 0.1)",
            },
          ],
          scales: {
            x: { time: true }, y: {
              auto: true,
              range: [],
            },
          },
          axes: [
            {
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
            {
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
          ],
        },
        data: [],
        layout: { x: 6, y: 0, w: 6, h: 10, i: "1" },
        bucket: "tomatoes",
        query: "|> range(start: -5m) |> filter(fn: (r) => r._measurement == \"cpu\") |> filter(fn: (r) => r[\"_field\"] == \"usage_user\") |> filter(fn: (r) => r[\"cpu\"] == \"cpu-total\")",
      },
      {
        id: 2,
        options: {
          title: "mem_used", ...getChartSize(2),
          padding: [null, null, null, 12],
          series: [
            {
              label: "Date",
            },
            {
              label: "",
              scale: "gb",
              points: {
                show: true,
                fill: "rgb(115, 191, 105)",
              },
              stroke: "rgb(115, 191, 105)",
              fill: "rgba(115, 191, 105, 0.1)",
            },
          ],
          scales: {
            x: { time: true }, y: {
              auto: true,
              range: [],
            },
          },
          axes: [
            {
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
            {
              scale: "gb",
              values: (self, ticks) => ticks.map(rawValue => (rawValue / 10 ** 9).toFixed(2) + "GB"),
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
          ],
        },
        data: [],
        layout: { x: 6, y: 0, w: 6, h: 10, i: "2" },
        bucket: "tomatoes",
        query: "|> range(start: -5m) |> filter(fn: (r) => r[\"_measurement\"] == \"mem\") |> filter(fn: (r) => r[\"_field\"] == \"used\")",
      },
    ]);

    const layout = ref(charts.value.map(chart => chart.layout));

    const updateLayout = (newLayout) => {
      newLayout.forEach((layoutItem) => {
        const chart = charts.value.find(c => c.id.toString() === layoutItem.i);
        if (chart) chart.layout = layoutItem;
      });
    };

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
    });

    const fetchChartData = async () => {
      for (let chartIndex in charts.value) {
        const { bucket, query } = charts.value[chartIndex];
        if (!bucket || !query) {
          console.error(`Dados ausentes para o gráfico ${chartIndex}`);
          continue;
        }
        try {
          const response = await influxdbDataService.getData({ bucket, query });
          const influxData = response.data;
          updateChartData(influxData, chartIndex);
        } catch (error) {
          console.error(`Erro ao buscar os dados do InfluxDB para o gráfico ${chartIndex}:`, error);
        }
      }
    }

    const updateChartData = (influxData, chartIndex) => {
      const timestamps = influxData.map(data => +new Date(data._time));
      const values = influxData.map(data => data._value);

      charts.value[chartIndex].data = [
        timestamps,
        values
      ];
    };

    onMounted(() => {
      // Busca os dados do gráfico assim que o componente é montado
      fetchChartData();

      window.addEventListener('resize', () => {
        updateChartsSize();
        updateQueriesWithTimeRange();
      });
    });

    const updateQueriesWithTimeRange = () => {
      for (let chartIndex in charts.value) {
        let query = charts.value[chartIndex].query;
        query = query.replace(/(\|> range\(start: )[^)]+\)/, `$1${timeRange.value})`);
        charts.value[chartIndex].query = query;
      }
    };

    const updateQueryRange = (value) => {
      timeRange.value = value;

      for (let chartIndex in charts.value) {
        const series = charts.value[chartIndex].options.series;
        series[1].points.show = value === '-5m';
        charts.value[chartIndex].options.series = series;
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
      charts,
      layout,
      registerRef,
      updateLayout,
      updateQueryRange,
      fetchChartData,
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

.u-title {
  color: #bdbdbd;
}

.u-label {
  color: #bdbdbd;
}

.u-container,
.u-plot {
  width: 100%;
  height: 100%;
}
</style>