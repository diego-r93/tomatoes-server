import { createRouter, createWebHistory } from 'vue-router'
import Authentication from '@/services/auth'

import DashboardRoutes from "@/router/dashboard.routes"
import DeviceRoutes from "@/router/device.routes"
import DatabaseRoutes from "@/router/database.routes"
import AlertRoutes from "@/router/alert.routes"
import NetworkRoutes from "@/router/network.routes"
import AccountRoutes from "@/router/account.routes"
import ConfigurationRoutes from "@/router/configuration.routes"
import AuthRoutes from "@/router/auth.routes"
import helpRoutes from "@/router/configuration.routes"

const routes = [
  {
    path: '/',
    redirect: "/dashboard",
    meta: {},
  },  
  {
    path: "/:pathMatch(.*)*",
    name: "error",
    component: () =>
      import(/* webpackChunkName: "error" */ "@/views/errors/NotFoundPage.vue"),
  },
  
  ...DashboardRoutes,
  ...DeviceRoutes,
  ...DatabaseRoutes,
  ...AlertRoutes,
  ...NetworkRoutes,
  ...AccountRoutes,
  ...ConfigurationRoutes,
  ...AuthRoutes,
  ...helpRoutes,
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
})

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  const authenticated = Authentication.isAuthenticated()

  if (requiresAuth && !authenticated) {
    next('/login')
  }
  else next()
})

export default router
