// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    theme: localStorage.getItem('TomatoesTheme') || 'dark'
  }), 
  actions: {
    changeTheme(newTheme) {
      localStorage.setItem('TomatoesTheme', newTheme);
    }
  }
})
