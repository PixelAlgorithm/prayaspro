export const API_BASE = '/api';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('prayaspro_token');
}

export function setStoredToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('prayaspro_token', token);
  } else {
    localStorage.removeItem('prayaspro_token');
  }
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('prayaspro_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: any | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('prayaspro_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('prayaspro_user');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data;
}
