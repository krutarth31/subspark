export function apiFetch(path: string, options?: RequestInit) {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  return fetch(base + path, options);
}

export function apiWsUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
  const wsBase = base
    ? base.replace(/^http/, 'ws')
    : `${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'}://${
        typeof window !== 'undefined' ? window.location.host : 'localhost:3000'
      }`;
  return wsBase + path;
}
