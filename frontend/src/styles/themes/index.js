import paletteTokens from './themes.module.scss';

export const themeCatalog = [
  { value: 'dark', title: 'Classic Dark', description: 'Charcoal & indigo', dark: true },
  { value: 'light', title: 'Classic Light', description: 'Clean & familiar', dark: false },
  { value: 'studioLight', title: 'Studio Light', description: 'Soft slate & blue', dark: false },
  { value: 'midnight', title: 'Midnight', description: 'Deep navy & teal', dark: true },
];
export function normalizeThemeName(name) {
  const migrated = { customLightTheme: 'studioLight', customDarkTheme: 'midnight' }[name] || name;
  return themeCatalog.some(theme => theme.value === migrated) ? migrated : 'dark';
}
export const themes = Object.fromEntries(themeCatalog.map(theme => {
  const prefix = `${theme.value}__`;
  const colors = Object.fromEntries(Object.entries(paletteTokens).filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value]));
  return [theme.value, { dark: theme.dark, colors }];
}));
