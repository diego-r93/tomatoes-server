import UsersComponent from "@/views/users/UsersComponent"
import TeamsComponent from "@/views/users/TeamsComponent"

export default [
  {
    path: "/users",
    redirect: '/users/users',
    meta: {
      requiresAuth: true,
      category: "Users",
      layout: "ui",
    },
    children: [
      {
        path: "users",
        component: UsersComponent
      },
      {
        path: "teams",
        component: TeamsComponent
      },     
    ],   
    component: () => import("@/views/UsersConfiguration.vue"),
  },
]