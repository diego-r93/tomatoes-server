export default [
  {
    path: "/account",
    meta: {
      requiresAuth: true,
      layout: "ui",
    },
    component: () => import("@/views/MyAccount.vue"),
  },
]