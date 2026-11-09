import type { RouteRecordRaw } from 'vue-router';

import DeviceComponent from '@/views/DeviceConfiguration.vue';

const meta = { requiresAuth: true, category: 'Device', layout: 'ui' } as const;
export default [
  { path: '/device', meta, component: DeviceComponent },
  { path: '/device/:id/info', meta, redirect: to => ({ path: '/device', query: { ...to.query, device: to.params.id, panel: 'information' } }) },
  { path: '/device/:id', meta, redirect: to => ({ path: '/device', query: { ...to.query, device: to.params.id, panel: 'firmware' } }) },
] satisfies RouteRecordRaw[];
