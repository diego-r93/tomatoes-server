import { defineStore } from 'pinia';

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    dashboard: JSON.parse(localStorage.getItem('TomatoesDashboard')) || []
  }),
  actions: {
    setDashboard(data) {
      this.dashboard = data;
    }
  },
});