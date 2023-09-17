export default [
  {
    path: "/network",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/NetworkConfiguration.vue"),
  },
]