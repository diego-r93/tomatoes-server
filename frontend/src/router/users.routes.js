export default [{
  path: '/users', redirect: '/users/users',
  meta: { requiresAuth: true, category: 'Users', layout: 'ui' },
  component: () => import('@/views/UsersConfiguration.vue'),
  children: [
    { path: 'users', component: () => import('@/views/users/UsersComponent.vue') },
    { path: 'users/:id', component: () => import('@/components/users/UserProfileCard.vue') },
    { path: 'groups', component: () => import('@/views/users/TeamsComponent.vue') },
    { path: 'teams', redirect: '/users/groups' },
    { path: 'invitations', component: () => import('@/components/users/InvitationsCard.vue') },
  ],
}];
