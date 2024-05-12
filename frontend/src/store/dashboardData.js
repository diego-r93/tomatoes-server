import { defineStore } from 'pinia';

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    dashboard: [],
    currentChart: null,
  }),
  actions: {
    setDashboard(data) {
      this.dashboard = data;
    },
    setCurrentChart(chart) {
      this.currentChart = chart;
    }
  },
});