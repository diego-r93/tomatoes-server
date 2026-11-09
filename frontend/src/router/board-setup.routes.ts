import type { RouteRecordRaw } from 'vue-router';

const meta = { requiresAuth: true, requiresAdmin: true, category: 'Board setup', layout: 'ui' } as const;
export default [
  { path: '/board-setup', meta, component: () => import('@/views/BoardSetup.vue') },
  { path: '/mdd', meta, redirect: '/board-setup' },
] satisfies RouteRecordRaw[];
