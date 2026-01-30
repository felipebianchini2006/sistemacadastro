export type AdminRole = 'ADMIN' | 'ANALYST' | 'VIEWER';

export type AdminUser = {
  id: string;
  email: string;
  roles: AdminRole[];
};

const ACCESS_COOKIE = 'admin_access';
const CSRF_COOKIE = 'csrf_token';
const USER_STORAGE = 'admin_user';

const getCookieValue = (name: string) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

const setCookie = (name: string, value: string, maxAgeSeconds?: number) => {
  if (typeof document === 'undefined') return;
  const parts = [`${name}=${encodeURIComponent(value)}`, 'path=/', 'samesite=lax'];
  if (maxAgeSeconds) parts.push(`max-age=${maxAgeSeconds}`);
  document.cookie = parts.join('; ');
};

const clearCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

const decodeBase64 = (input: string) => {
  if (typeof window === 'undefined') return '';
  const pad = '='.repeat((4 - (input.length % 4)) % 4);
  return atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
};

export const decodeJwt = <T extends Record<string, unknown>>(token: string): T | null => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = decodeBase64(payload);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
};

export const getAdminAccessToken = () => getCookieValue(ACCESS_COOKIE);
export const getCsrfToken = () => getCookieValue(CSRF_COOKIE);

export const setAdminSession = (token: string, user: AdminUser) => {
  const payload = decodeJwt<{ exp?: number }>(token);
  const maxAge = payload?.exp
    ? Math.max(payload.exp - Math.floor(Date.now() / 1000), 60)
    : undefined;
  setCookie(ACCESS_COOKIE, token, maxAge);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(USER_STORAGE, JSON.stringify(user));
  }
};

export const clearAdminSession = () => {
  clearCookie(ACCESS_COOKIE);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_STORAGE);
  }
};

export const getStoredAdminUser = (): AdminUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_STORAGE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
};
