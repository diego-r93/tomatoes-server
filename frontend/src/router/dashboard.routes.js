export default [
  {
    path: "/dashboard",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/DashBoard.vue"),
  },
]