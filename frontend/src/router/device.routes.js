export default [
  {
    path: "/device",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/DeviceConfiguration.vue"),
  },
]