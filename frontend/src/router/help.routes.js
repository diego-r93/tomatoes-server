export default [
  {
    path: "/help",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/HelpMenu.vue"),
  },
]