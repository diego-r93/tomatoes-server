import { inject } from 'vue';
import type { InjectionKey, Ref } from 'vue';
import type { EmailConfiguration, UserIdentity } from '@/services/userTypes';

interface UserManagementContext {
  actor: Ref<UserIdentity | null>;
  emailConfiguration: Ref<EmailConfiguration>;
  loadIdentity: () => Promise<void>;
  refreshInvitations: Ref<number>;
}

export const userManagementKey: InjectionKey<UserManagementContext> = Symbol('userManagement');

export function useUserManagement() {
  const context = inject(userManagementKey);
  if (!context) throw new Error('User management requires a Users page.');
  return context;
}
