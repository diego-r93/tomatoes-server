export default [
  {
    path: '/login',
    meta: {
      layout: "auth",
    },
    component: () => import("@/views/LoginPage.vue"),
  },
  {
    path: '/signup',
    meta: {
      layout: "auth",
    },
    component: () => import("@/views/SignUpPage.vue"),
  },
  {
    path: '/resetpassword',
    meta: {
      layout: "auth",
    },
    component: () => import("@/views/SendPasswordResetEmail.vue"),
  },
]