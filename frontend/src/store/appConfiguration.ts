import { defineStore } from 'pinia';
import { normalizeThemeName } from '@/styles/themes';

const storageKey = 'TomatoesAppearance';
type Density = 'comfortable' | 'compact';
const defaults = { theme: normalizeThemeName('dark'), followSystem: false, density: 'comfortable' as Density, sidebarExpanded: false, reduceMotion: false };
export function systemTheme(): 'dark' | 'light' { return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
export function readAppearance() {
  const initial = { ...defaults, storageUnavailable: false };
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      const preferences = saved as Record<string, unknown>;
      initial.theme = normalizeThemeName(preferences.theme);
      for (const key of ['followSystem', 'sidebarExpanded', 'reduceMotion'] as const) {
        const value = preferences[key];
        if (typeof value === 'boolean') initial[key] = value;
      }
      if (preferences.density === 'comfortable' || preferences.density === 'compact') initial.density = preferences.density;
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
        const preferences = Object.fromEntries((Object.keys(defaults) as (keyof typeof defaults)[]).map(key => [key, this[key]]));
        localStorage.setItem(storageKey, JSON.stringify(preferences));
        localStorage.setItem('TomatoesTheme', this.theme);
        this.storageUnavailable = false;
      } catch { this.storageUnavailable = true; }
    },
    changeTheme(name: unknown) { this.theme = normalizeThemeName(name); this.followSystem = false; this.persistAppearance(); },
    setFollowSystem(value: boolean | null) { this.followSystem = Boolean(value); if (this.followSystem) this.theme = systemTheme(); this.persistAppearance(); },
    syncSystemTheme() { if (this.followSystem) { this.theme = systemTheme(); this.persistAppearance(); } },
    setDensity(value: unknown) { if (value !== 'comfortable' && value !== 'compact') return; this.density = value; this.persistAppearance(); },
    setSidebarExpanded(value: boolean | null) { this.sidebarExpanded = Boolean(value); this.persistAppearance(); },
    setReduceMotion(value: boolean | null) { this.reduceMotion = Boolean(value); this.persistAppearance(); },
    resetAppearance() { Object.assign(this, defaults); this.persistAppearance(); },
  },
});
