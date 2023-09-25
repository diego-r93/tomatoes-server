<template>
  <div>
    <UplotVue :options="options" :data="data" />
  </div>
</template>

<script>
import "uplot/dist/uPlot.min.css";
import { defineComponent, ref, toRefs, watch } from 'vue';
import UplotVue from "uplot-vue";

export default defineComponent({
  name: "ChartComponent",
  components: { UplotVue },
  props: {
    chartOptions: {
      type: Object,
      required: true
    },
    chartData: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    const { chartOptions, chartData } = toRefs(props);

    const options = ref({...chartOptions.value});
    const data = ref([...(chartData.value || [])]);

    watch(chartOptions, (newVal) => {
      options.value = {...newVal};
    });

    watch(chartData, (newVal) => {
      data.value = [...newVal];
    });

    return { options, data };
  }
});
</script>