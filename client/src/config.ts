const configuredApiBaseUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL =
  (configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : '/api'
  ).replace(/\/+$/, '');

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
