export default [
  {
    path: "/mdd",
    meta: {
      requiresAuth: true,
      category: "MDD",
      layout: "ui",
    },     
    component: () => import("@/views/MDDConfiguration.vue"),
  },  
]