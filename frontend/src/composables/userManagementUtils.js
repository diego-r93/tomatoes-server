import { formatDateTime } from './dateTime.mjs';
export const userError = error => error.response?.data?.message || error.message || 'The operation could not be completed.';
export const fullName = user => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username || 'User';
export const userRoleLabel = user => user.isAdmin ? 'Admin' : 'User';
export const initials = user => fullName(user).split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
export function dateTime(value, fallback = 'Never') { return formatDateTime(value, 'Browser', fallback); }
export const validEmail = value => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value || '') || 'Enter a valid email address.';
export const required = value => Boolean(String(value || '').trim()) || 'This field is required.';
