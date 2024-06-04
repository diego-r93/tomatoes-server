import { createRouter, createWebHistory } from 'vue-router'
import Authentication from '@/services/auth'

import DashboardRoutes from "@/router/dashboard.routes"
import DeviceRoutes from "@/router/device.routes"
import DatabaseRoutes from "@/router/database.routes"
import AlertingRoutes from "@/router/alerting.routes"
import MDDRoutes from "@/router/mdd.routes"
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
  ...MDDRoutes,
  ...UsersRoutes,
  ...ConfigurationRoutes,
  ...AuthRoutes,
  ...HelpRoutes,
]

let authInterval = null;

const startAuthInterval = () => {
  if (authInterval) {
    clearInterval(authInterval);
  }
  authInterval = setInterval(() => {
    const isAuthenticated = Authentication.isAuthenticated();
    if (!isAuthenticated) {
      clearInterval(authInterval);  // Parar de verificar uma vez que não está mais autenticado.
    }
  }, 1000 * 60);  // A cada 1 minuto
};

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

  if (requiresAuth) {
    if (!authenticated) {
      clearInterval(authInterval);  // Certificar-se de limpar o intervalo se não estiver autenticado.
      next('/login');
    } else {
      startAuthInterval();  // Iniciar o intervalo se estiver autenticado.
      next();
    }
  } else {
    clearInterval(authInterval);  // Limpar o intervalo se a rota não requer autenticação.
    next();
  }
})

export default router
