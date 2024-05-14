<template>
  <div>
    <UplotVue :options="options" :data="data" />
  </div>
</template>

<script setup>
import "uplot/dist/uPlot.min.css";
import { ref, toRefs, watch } from 'vue';
import UplotVue from "uplot-vue";

const props = defineProps({
  chartOptions: {
    type: Object,
    required: true
  },
  chartData: {
    type: Array,
    required: true
  }
});

const { chartOptions, chartData } = toRefs(props);

const options = ref({...chartOptions.value});
const data = ref([...(chartData.value || [])]);

watch(chartOptions, (newVal) => {
  options.value = {...newVal};
}, { deep: true });

watch(chartData, (newVal) => {
  data.value = [...newVal];
}, { deep: true });

</script>
