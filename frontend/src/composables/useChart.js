// src/composables/useChart.js
import { ref, reactive } from 'vue';
import influxdbDataService from '@/services/influxdbDataService';

export const useChart = () => {
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
      { label: '2 weeks', value: '-2w', range: '30m' },
      { label: '1 month', value: '-4w', range: '1h' },
      { label: '3 months', value: '-12w', range: '2h' },
      { label: '6 months', value: '-24w', range: '6h' },
      { label: '1 year', value: '-52w', range: '12h' },
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

  return {
    timeSince,
    timeRange,
    state,
    getFormatFunction,
  };
};