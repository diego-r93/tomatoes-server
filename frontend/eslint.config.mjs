import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

const typedComponents = ['src/components/database/*.vue', 'src/components/configuration/*.vue', 'src/components/auth/{SignIn,SendEmail}.vue', 'src/views/{AcceptInvitationPage,ResetPasswordPage,SendPasswordResetEmail}.vue', 'src/components/users/*.vue', 'src/views/UsersConfiguration.vue', 'src/views/users/*.vue', 'src/components/help/HelpMenu.vue', 'src/components/dashboard/{Chart,GaugeChart,StatChart,PanelVisualization,PanelEditor,PanelInspector,InfoCard,DashboardPanel,DashboardTimeRange}.vue', 'src/components/alert/*.vue', 'src/components/device/DeviceCard.vue', 'src/components/device/DeviceDetails.vue', 'src/components/device/PumpHistoryDialog.vue'];
const typedFiles = ['src/**/*.ts', ...typedComponents];

export default [
  { ignores: ['node_modules/**', 'dist/**'] },
  js.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['src/**/*.{js,vue}', 'vite.config.js'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  ...tseslint.configs.recommended.map(config => ({ ...config, files: typedFiles })),
  {
    files: typedComponents,
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser },
    },
  },
];
