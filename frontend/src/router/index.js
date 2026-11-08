import { createRouter, createWebHistory } from 'vue-router'
import Authentication from '@/services/auth'

import DashboardRoutes from "@/router/dashboard.routes"
import DeviceRoutes from "@/router/device.routes"
import DatabaseRoutes from "@/router/database.routes"
import AlertingRoutes from "@/router/alerting.routes"
import BoardSetupRoutes from "@/router/board-setup.routes"
import UsersRoutes from "@/router/users.routes"
import ConfigurationRoutes from "@/router/configuration.routes"
import AuthRoutes from "@/router/auth.routes"
import HelpRoutes from "@/router/help.routes"

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
  ...AlertingRoutes,
  ...BoardSetupRoutes,
  ...UsersRoutes,
  ...ConfigurationRoutes,
  ...AuthRoutes,
  ...HelpRoutes,
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes: routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else if (to.hash && document.getElementById(to.hash.slice(1))) {
      return { el: to.hash, top: 88 };
    } else {
      return { top: 0 };
    }
  },
})

router.beforeEach(async to => {
  if (!to.matched.some(record => record.meta.requiresAuth)) return;
  try {
    const user = await Authentication.validateSession();
    if (!user) return '/login';
    if (to.matched.some(record => record.meta.requiresAdmin) && !user.isAdmin) return '/device';
  } catch {
    // Keep the current page when the server is temporarily unavailable.
    return false;
  }
});
window.addEventListener('tomatoes:session-ended', () => {
  if (router.currentRoute.value.matched.some(record => record.meta.requiresAuth)) router.replace('/login');
});
export default router;
