const DEFAULT_LOCAL_SITE_URL = 'http://localhost:3000';

export function getSiteUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_LOCAL_SITE_URL).trim().replace(/\/+$/, '');
}

export function getAuthRedirectUrl(path: '/auth/callback' | '/auth/reset-password'): string {
  return new URL(path, `${getSiteUrl()}/`).toString();
}
