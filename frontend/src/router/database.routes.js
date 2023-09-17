export default [
  {
    path: "/database",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/DatabaseConfiguration.vue"),
  },
]