// Utilities
import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    theme: localStorage.getItem('theme') || 'dark'
  }), 
  actions: {
    changeTheme(newTheme) {
      localStorage.setItem('theme', newTheme);
    }
  }
})
