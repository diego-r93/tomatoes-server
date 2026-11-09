import type { RouteRecordRaw } from 'vue-router';

export default [
  {
    path: "/configuration",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/PageConfiguration.vue"),
  },
] satisfies RouteRecordRaw[];
