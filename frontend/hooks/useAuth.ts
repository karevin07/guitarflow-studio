import { useCallback, useEffect, useState } from 'react';
import { ApiError, AuthUser, authApi, authStorage } from '../services/apiClient';

interface UseAuthResult {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = (): UseAuthResult => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = authStorage.getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        setUser(me);
      } catch {
        authStorage.clearToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    authStorage.setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const result = await authApi.register(username, password);
    authStorage.setToken(result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (authStorage.getToken()) {
        await authApi.logout();
      }
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        throw err;
      }
    } finally {
      authStorage.clearToken();
      setUser(null);
    }
  }, []);

  return { user, loading, login, register, logout };
};
