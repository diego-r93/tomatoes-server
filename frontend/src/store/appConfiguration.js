import { defineStore } from 'pinia';
import { normalizeThemeName } from '@/styles/themes';

const storageKey = 'TomatoesAppearance';
const defaults = { theme: 'dark', followSystem: false, density: 'comfortable', sidebarExpanded: false, reduceMotion: false };
export function systemTheme() { return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
export function readAppearance() {
  const initial = { ...defaults, storageUnavailable: false };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      initial.theme = normalizeThemeName(saved.theme);
      for (const key of ['followSystem', 'sidebarExpanded', 'reduceMotion']) if (typeof saved[key] === 'boolean') initial[key] = saved[key];
      if (['comfortable', 'compact'].includes(saved.density)) initial.density = saved.density;
    } else initial.theme = normalizeThemeName(localStorage.getItem('TomatoesTheme'));
  } catch { initial.storageUnavailable = true; }
  if (initial.followSystem) initial.theme = systemTheme();
  return initial;
}
export const useAppStore = defineStore('app', {
  state: readAppearance,
  actions: {
    persistAppearance() {
      try {
        const preferences = Object.fromEntries(Object.keys(defaults).map(key => [key, this[key]]));
        localStorage.setItem(storageKey, JSON.stringify(preferences));
        localStorage.setItem('TomatoesTheme', this.theme);
        this.storageUnavailable = false;
      } catch { this.storageUnavailable = true; }
    },
    changeTheme(name) { this.theme = normalizeThemeName(name); this.followSystem = false; this.persistAppearance(); },
    setFollowSystem(value) { this.followSystem = Boolean(value); if (this.followSystem) this.theme = systemTheme(); this.persistAppearance(); },
    syncSystemTheme() { if (this.followSystem) { this.theme = systemTheme(); this.persistAppearance(); } },
    setDensity(value) { if (!['comfortable', 'compact'].includes(value)) return; this.density = value; this.persistAppearance(); },
    setSidebarExpanded(value) { this.sidebarExpanded = Boolean(value); this.persistAppearance(); },
    setReduceMotion(value) { this.reduceMotion = Boolean(value); this.persistAppearance(); },
    resetAppearance() { Object.assign(this, defaults); this.persistAppearance(); },
  },
});
