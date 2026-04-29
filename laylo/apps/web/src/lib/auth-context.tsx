'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, setAuthToken, clearAuthToken, getAuthToken, ApiError } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  avatarUrl: string | null;
  onboardingComplete: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

interface AuthApiResponse {
  success: boolean;
  data: { user: User; accessToken: string };
}

interface MeApiResponse {
  success: boolean;
  data: { user: User };
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/', '/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // On mount: if a JWT is in sessionStorage, validate it via /api/auth/me
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await api.get<MeApiResponse>('/api/auth/me');
        if (!cancelled) setUser(res.data.user);
      } catch {
        // Token invalid/expired — clear it
        clearAuthToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (isLoading) return;
    const isPublic = PUBLIC_ROUTES.includes(pathname);
    if (!user && !isPublic) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await api.post<AuthApiResponse>('/api/auth/login', { email, password });
        setAuthToken(res.data.accessToken);
        setUser(res.data.user);
        router.push('/dashboard');
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.message);
        }
        throw err;
      }
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        const res = await api.post<AuthApiResponse>('/api/auth/register', {
          email,
          password,
          name,
        });
        setAuthToken(res.data.accessToken);
        setUser(res.data.user);
        router.push('/dashboard');
      } catch (err) {
        if (err instanceof ApiError) {
          throw new Error(err.message);
        }
        throw err;
      }
    },
    [router],
  );

  const logout = useCallback(() => {
    // Best-effort server-side revoke; never block UI on it
    api.post('/api/auth/logout').catch(() => {});
    clearAuthToken();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
