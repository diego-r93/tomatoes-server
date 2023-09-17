export default [
  {
    path: "/configuration",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/PageConfiguration.vue"),
  },
]