const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const getApiBaseUrl = () => {
  const explicitBase = import.meta.env.VITE_API_BASE_URL;
  if (explicitBase) {
    return trimTrailingSlash(explicitBase);
  }

  return '/api';
};

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};
