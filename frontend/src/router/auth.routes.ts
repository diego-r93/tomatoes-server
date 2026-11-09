import type { RouteRecordRaw } from 'vue-router';

export default [
  { path: '/login', meta: { layout: 'auth' }, component: () => import('@/views/LoginPage.vue') },
  { path: '/signup', meta: { layout: 'auth' }, component: () => import('@/views/SignUpPage.vue') },
  { path: '/resetpassword', meta: { layout: 'auth' }, component: () => import('@/views/SendPasswordResetEmail.vue') },
  { path: '/invite/:token', meta: { layout: 'auth' }, component: () => import('@/views/AcceptInvitationPage.vue') },
  { path: '/reset-password/:token', meta: { layout: 'auth' }, component: () => import('@/views/ResetPasswordPage.vue') },
] satisfies RouteRecordRaw[];
