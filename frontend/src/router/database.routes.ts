import type { RouteRecordRaw } from 'vue-router';

export default [
  {
    path: "/database",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/DatabaseConfiguration.vue"),
  },
] satisfies RouteRecordRaw[];
