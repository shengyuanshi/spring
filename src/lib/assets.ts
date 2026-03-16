const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const buildAssetUrl = (path: string) => {
  const normalizedBase = trimTrailingSlash(import.meta.env.BASE_URL || '/');
  const normalizedPath = path.replace(/^\/+/, '');

  if (!normalizedPath) {
    return `${normalizedBase}/`;
  }

  return `${normalizedBase}/${normalizedPath}`;
};
