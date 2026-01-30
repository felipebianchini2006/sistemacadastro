import {
  getAdminAccessToken,
  getCsrfToken,
  setAdminSession,
  clearAdminSession,
  type AdminUser,
} from './auth';

const getApiBase = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

const buildUrl = (path: string) => {
  const base = getApiBase();
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

export const adminFetch = async <T>(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Json;
    auth?: boolean;
  } = {},
): Promise<T> => {
  const token = options.auth ? getAdminAccessToken() : null;
  const csrf = getCsrfToken();
  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrf ? { 'x-csrf-token': csrf } : {}),
      ...(options.headers ?? {}),
    },
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(message || 'Falha na requisicao') as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
};

export const loginAdmin = async (email: string, password: string) => {
  const response = await adminFetch<{ user: AdminUser; accessToken: string }>('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });

  setAdminSession(response.accessToken, response.user);
  return response.user;
};

export const refreshAdminSession = async () => {
  const response = await adminFetch<{ user: AdminUser; accessToken: string }>('/auth/refresh', {
    method: 'POST',
    auth: false,
  });
  setAdminSession(response.accessToken, response.user);
  return response.user;
};

export const logoutAdmin = async () => {
  try {
    await adminFetch('/auth/logout', { method: 'POST', auth: false });
  } finally {
    clearAdminSession();
  }
};

export const adminFetchWithRefresh = async <T>(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Json;
  } = {},
): Promise<T> => {
  try {
    return await adminFetch<T>(path, { ...options, auth: true });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401) {
      await refreshAdminSession();
      return adminFetch<T>(path, { ...options, auth: true });
    }
    throw error;
  }
};
