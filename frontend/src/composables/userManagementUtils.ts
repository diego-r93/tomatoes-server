import { isAxiosError } from 'axios';
import type { UserIdentity } from '@/services/userTypes';
import { formatDateTime } from './dateTime.ts';
export function userError(error: unknown) {
  const message = isAxiosError<{ message?: string }>(error) ? error.response?.data?.message : undefined;
  return message || (error instanceof Error && error.message) || 'The operation could not be completed.';
}
export const fullName = (user: Pick<UserIdentity, 'firstName' | 'lastName' | 'username'> | null) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'User';
export const userRoleLabel = (user: Pick<UserIdentity, 'isAdmin'>) => user.isAdmin ? 'Admin' : 'User';
export const initials = (user: Parameters<typeof fullName>[0]) => fullName(user).split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
export function dateTime(value: string | null, fallback = 'Never') { return formatDateTime(value, 'Browser', fallback); }
export const validEmail = (value: string | null | undefined) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value || '') || 'Enter a valid email address.';
export const required = (value: unknown) => Boolean(String(value || '').trim()) || 'This field is required.';

export const passwordRule = (value: string | null | undefined) => (typeof value === 'string' && value.length >= 8 && new TextEncoder().encode(value).length <= 72) || 'Use at least 8 characters and no more than 72 bytes.';
