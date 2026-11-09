import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import vueParser from 'vue-eslint-parser';

const typedComponents = ['src/components/device/DeviceCard.vue', 'src/components/device/PumpHistoryDialog.vue'];
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
