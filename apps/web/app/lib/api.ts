type Json = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

const getApiBase = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

const buildUrl = (path: string) => {
  const base = getApiBase();
  if (!base) return path;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
};

export const apiFetch = async <T>(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: Json;
  } = {},
): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Falha na requisicao');
  }

  return (await response.json()) as T;
};

export const apiUpload = async <T>(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body: FormData;
  },
): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'POST',
    headers: {
      ...(options.headers ?? {}),
    },
    body: options.body,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Falha na requisicao');
  }

  return (await response.json()) as T;
};
