export default [
  {
    path: "/alert",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/AlertConfiguration.vue"),
  },
]