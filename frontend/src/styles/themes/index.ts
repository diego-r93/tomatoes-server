type ThemeName = 'dark' | 'light' | 'studioLight' | 'midnight';

import paletteTokens from './themes.module.scss';

export const themeCatalog: { value: ThemeName; title: string; description: string; dark: boolean }[] = [
  { value: 'dark', title: 'Classic Dark', description: 'Charcoal & indigo', dark: true },
  { value: 'light', title: 'Classic Light', description: 'Clean & familiar', dark: false },
  { value: 'studioLight', title: 'Studio Light', description: 'Soft slate & blue', dark: false },
  { value: 'midnight', title: 'Midnight', description: 'Deep navy & teal', dark: true },
];
export function normalizeThemeName(name: unknown): ThemeName {
  const migrated = name === 'customLightTheme' ? 'studioLight' : name === 'customDarkTheme' ? 'midnight' : name;
  return themeCatalog.find(theme => theme.value === migrated)?.value ?? 'dark';
}
export const themes = Object.fromEntries(themeCatalog.map(theme => {
  const prefix = `${theme.value}__`;
  const colors = Object.fromEntries(Object.entries(paletteTokens).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value]));
  return [theme.value, { dark: theme.dark, colors }];
}));
