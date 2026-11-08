const meta = { requiresAuth: true, requiresAdmin: true, category: 'Board setup', layout: 'ui' };
export default [
  { path: '/board-setup', meta, component: () => import('@/views/BoardSetup.vue') },
  { path: '/mdd', meta, redirect: '/board-setup' },
];
