// Relative by default: the Vite dev server proxies /api to Django. Set VITE_API_URL to call a backend directly.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'guitarflow-auth-token';

export interface AuthUser {
  id: number;
  username: string;
}

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const getApiBaseUrl = () => API_BASE_URL;

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Token ${token}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (typeof payload.detail === 'string') detail = payload.detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(detail, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  async register(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    return apiFetch('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    return apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  async logout(): Promise<void> {
    await apiFetch('/auth/logout/', { method: 'POST' });
  },

  async me(): Promise<AuthUser> {
    return apiFetch('/auth/me/');
  },
};
