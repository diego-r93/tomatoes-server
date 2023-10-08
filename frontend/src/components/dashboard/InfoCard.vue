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

      <v-btn class="me-2 text-none rounded-xs custom-border" variant="flat">
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
        <v-btn class="text-none rounded-xs custom-border" variant="flat" @click="fetchChartData">
          <v-icon color="#bdbdbd" icon="mdi-sync"></v-icon>
        </v-btn>
      </div>
    </v-app-bar>

    <grid-layout :layout="layout" @update:modelValue="updateLayout" :col-num="12" :row-height="30"
      :is-draggable="draggable" :is-resizable="resizable" :vertical-compact="true" :use-css-transforms="true">

      <grid-item v-for="chart in layout" :key="chart.i" :x="chart.x" :y="chart.y" :w="chart.w" :h="chart.h" :i="chart.i"
        :ref="el => registerRef(Number(chart.i), el)" drag-ignore-from=".no-drag"
        :class="{ 'new-chart-border': Number(chart.i) === charts.length }">

        <!-- Se for o ID do novo item placeholder, mostre o card "Add New Chart to Panel" -->
        <template v-if="Number(chart.i) === charts.length">
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
          <v-hover>
            <template v-slot:default="{ isHovering, props }">
              <v-card :color="isHovering ? '#3c3c3c' : undefined" v-bind="props"
                class="py-1 text-none rounded-xs text-center" variant="flat">
                <span style="color: #bdbdbd">{{ getChartById(chart.i).options.chartTitle }}</span>
              </v-card>
            </template>
          </v-hover>
          <Chart class="no-drag" :chartOptions="getChartById(chart.i).options" :chartData="getChartById(chart.i).data"
            :key="chart.i + '-' + getChartById(chart.i).options.width + '-' + getChartById(chart.i).options.height" />
        </template>
      </grid-item>
    </grid-layout>

  </v-container>
</template>

<script>
import { reactive, ref, toRefs, onMounted, nextTick } from 'vue'
import { GridLayout, GridItem } from "vue-grid-layout"
import Chart from '@/components/dashboard/Chart.vue'
import influxdbDataService from '@/services/influxdbDataService'

export default {
  components: { GridLayout, GridItem, Chart },
  setup() {
    const gridItemsRefs = ref({});
    const charts = reactive([
      {
        id: 0,
        draggable: false,
        options: {
          chartTitle: "cpu_temperature",
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
                fill: "rgb(242, 73, 92)",
              },
              stroke: "rgb(242, 73, 92)",
              fill: "rgba(242, 73, 92, 0.1)",
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
              values: (self, ticks) => ticks.map(rawValue => rawValue.toFixed(2) + "° C"),
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
          ],
        },
        data: [],
        layout: { x: 0, y: 0, w: 4, h: 10, i: "0" },
        bucket: "tomatoes",
        query: `|> range(start: -5m)
                |> filter(fn: (r) => r["_measurement"] == "cpu_temperature")
                |> filter(fn: (r) => r["_field"] == "value")
                |> filter(fn: (r) => r["host"] == "raspberrypi")
                |> map(fn: (r) => ({ r with _value: r._value / 1000 }))
                |> aggregateWindow(every: 500ms, fn: mean, createEmpty: false)   
                |> yield(name: "mean")`,
      },
      {
        id: 1,
        draggable: false,
        options: {
          chartTitle: "cpu_total",
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
        layout: { x: 4, y: 0, w: 4, h: 10, i: "1" },
        bucket: "tomatoes",
        query: `|> range(start: -5m)
                |> filter(fn: (r) => r["_measurement"] == "cpu")
                |> filter(fn: (r) => r["_field"] == "usage_user")
                |> filter(fn: (r) => r["cpu"] == "cpu-total")
                |> filter(fn: (r) => r["host"] == "raspberrypi")
                |> aggregateWindow(every: 500ms, fn: mean, createEmpty: false)
                |> yield(name: "mean")`,
      },
      {
        id: 2,
        options: {
          chartTitle: "mem_used",
          padding: [null, null, null, 12],
          series: [
            {
              label: "Date",
            },
            {
              label: "",
              scale: "mb",
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
              scale: "mb",
              values: (self, ticks) => ticks.map(rawValue => (rawValue / 10 ** 6).toFixed(0) + "MB"),
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
          ],
        },
        data: [],
        layout: { x: 8, y: 0, w: 4, h: 10, i: "2" },
        bucket: "tomatoes",
        query: `|> range(start: -5m)
                |> filter(fn: (r) => r["_measurement"] == "mem")
                |> filter(fn: (r) => r["_field"] == "used")
                |> filter(fn: (r) => r["host"] == "raspberrypi")
                |> aggregateWindow(every: 500ms, fn: mean, createEmpty: false)
                |> yield(name: "mean")`,
      },
      {
        id: 3,
        options: {
          chartTitle: "disk_used",
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
                fill: "rgb(184, 119, 217)",
              },
              stroke: "rgb(184, 119, 217)",
              fill: "rgba(184, 119, 217, 0.1)",
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
        layout: { x: 0, y: 10, w: 4, h: 10, i: "3" },
        bucket: "tomatoes",
        query: `|> range(start: -5m)        
                |> filter(fn: (r) => r["_measurement"] == "disk")
                |> filter(fn: (r) => r["_field"] == "used")
                |> filter(fn: (r) => r["device"] == "mmcblk0p2")
                |> filter(fn: (r) => r["fstype"] == "ext4")
                |> filter(fn: (r) => r["host"] == "raspberrypi")
                |> filter(fn: (r) => r["mode"] == "rw")
                |> filter(fn: (r) => r["path"] == "/etc/hostname")
                |> aggregateWindow(every: 500ms, fn: mean, createEmpty: false)
                |> yield(name: "mean")`,
      },
      {
        id: 4,
        draggable: false,
        options: {
          chartTitle: "swap",
          padding: [null, null, null, 15],
          series: [
            {
              label: "Date",
            },
            {
              label: "",
              scale: "mb",
              points: {
                show: true,
                fill: "rgb(255, 152, 48)",
              },
              stroke: "rgb(255, 152, 48)",
              fill: "rgba(255, 152, 48, 0.1)",
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
              scale: "mb",
              values: (self, ticks) => ticks.map(rawValue => (rawValue / 10 ** 6).toFixed(0) + "MB"),
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
          ],
        },
        data: [],
        layout: { x: 4, y: 10, w: 4, h: 10, i: "4" },
        bucket: "tomatoes",
        query: `|> range(start: -5m) 
                |> filter(fn: (r) => r["_measurement"] == "swap")
                |> filter(fn: (r) => r["_field"] == "used")
                |> filter(fn: (r) => r["host"] == "raspberrypi")
                |> aggregateWindow(every: 500ms, fn: mean, createEmpty: false)
                |> yield(name: "mean")`,
      },
    ]);

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

    const layout = ref(charts.map(chart => chart.layout));
    const index = ref(layout.value.length);

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
      charts.forEach(chart => {
        const size = getChartSize(chart.id);
        const titleHeight = 20;
        const xAxisHeight = 50;
        const legendHeight = 31;
        chart.options.width = size.width;
        chart.options.height = size.height - xAxisHeight - legendHeight + titleHeight;
      });
    };

    const fetchChartData = async () => {
      for (let chartIndex in charts) {
        const { bucket, query } = charts[chartIndex];
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
      const timestamps = influxData.map(data => Math.floor(+new Date(data._time) / 1000));
      const values = influxData.map(data => data._value);

      charts[chartIndex].data = [
        timestamps,
        values
      ];
    };

    const updateQueriesWithTimeRange = () => {
      const selectedOption = state.timeOptions.find(option => option.label === state.selectedLabel);

      for (let chartIndex in charts) {
        let query = charts[chartIndex].query;

        // Atualizar a range da query
        query = query.replace(/(\|> range\(start: )[^)]+\)/, `$1${selectedOption.value})`);

        // Atualizar o windowPeriod na query
        const regex = new RegExp('\\|> aggregateWindow\\(every: [^,]+,', 'g');
        query = query.replace(regex, `|> aggregateWindow(every: ${selectedOption.range},`);

        charts[chartIndex].query = query;
      }
    };

    const updateQueryRange = (value) => {
      timeRange.value = value;

      const selectedItem = state.timeOptions.find(item => item.value === value);
      if (selectedItem) {
        state.selectedLabel = selectedItem.label;
      }

      for (let chartIndex in charts) {
        const chart = charts[chartIndex];
        chart.options = {
          ...chart.options,
          series: [
            chart.options.series[0],
            {
              ...chart.options.series[1],
              points: {
                ...chart.options.series[1].points,
                show: timeRange.value === '-5m'
              }
            }
          ]
        };
      }
      updateQueriesWithTimeRange();
      fetchChartData();
    };

    const updateLayout = (newLayout) => {
      newLayout.forEach((layoutItem) => {
        const chart = charts.find(c => c.id.toString() === layoutItem.i);
        if (chart) chart.layout = layoutItem;
      });
    };

    const getChartById = (id) => {
      return charts.find(c => c.id === Number(id));
    };

    const addPlaceHolder = () => {
      const newId = charts.length;

      // Criar um novo objeto de layout
      const newLayout = {
        x: 0,
        y: 0,
        w: 6,
        h: 8,
        i: newId.toString(),
      };

      // Atualize os gráficos existentes para mover para baixo, se necessário
      layout.value.forEach(item => {
        // Se um gráfico já está na mesma posição ou abaixo do novo gráfico
        if (item.y >= newLayout.y) {
          // Mova esse gráfico para baixo
          item.y += newLayout.h;
        }
      });

      layout.value.push(newLayout);

      index.value++;

      nextTick(() => {
        updateChartsSize();
        fetchChartData();
      });
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
        data: [],
        options: {
          chartTitle: "mem_used",
          padding: [null, null, null, 12],
          series: [
            {
              label: "Date",
            },
            {
              label: "",
              scale: "mb",
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
              scale: "mb",
              values: (self, ticks) => ticks.map(rawValue => (rawValue / 10 ** 6).toFixed(0) + "MB"),
              stroke: "#bdbdbd",
              grid: {
                stroke: '#2C3033',
                width: 1
              }
            },
          ],
        },
        layout: placeholderLayout,  // use o layout existente do placeholder
        bucket: "tomatoes",
        query: `|> range(start: -5m) 
                |> filter(fn: (r) => r["_measurement"] == "mem") 
                |> filter(fn: (r) => r["_field"] == "used")`,
      });

      nextTick(() => {
        updateChartsSize();
        fetchChartData();
      });
    };

    const removeItem = (id) => {
      const index = charts.value.findIndex(c => c.id === id);
      if (index > -1) {
        charts.splice(index, 1);
        layout.value.splice(index, 1);
      }
    };


    onMounted(() => {
      // Busca os dados do gráfico assim que o componente é montado
      fetchChartData();

      window.addEventListener('resize', () => {
        updateChartsSize();
        updateQueriesWithTimeRange();
      });
    });

    return {
      ...toRefs(state),
      charts,
      layout,
      getChartById,
      registerRef,
      updateLayout,
      updateQueryRange,
      fetchChartData,
      addPlaceHolder,
      removePlaceHolder,
      addItem,
      removeItem,
    }
  },
}
</script>

<style>
.vue-grid-item:hover {
  opacity: 0.7;
}

.vue-grid-item.resizing {
  opacity: 0.9;
}

.vue-grid-item.vue-grid-placeholder {
  background: rgb(60, 190, 160);
}

.vue-grid-item:not(.vue-grid-placeholder) {
  background: #212121;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
}

.u-label {
  color: #bdbdbd;
}

.v-btn--size-default {
  --v-btn-size: 0.875rem;
  --v-btn-height: 32px;
  font-size: var(--v-btn-size);
  min-width: 36px;
  padding: 0 8px;
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
</style>