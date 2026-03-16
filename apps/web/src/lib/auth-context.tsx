'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  avatarUrl: string | null;
  onboardingComplete: boolean;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
  };
}

interface RefreshResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
  };
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Try to restore session on mount
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const res = await api.post<RefreshResponse>('/api/auth/refresh');
        if (!cancelled && res.success) {
          setUser(res.data.user);
          setAccessToken(res.data.accessToken);
        }
      } catch {
        // No valid refresh token — user is not logged in
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>('/api/auth/login', {
        email,
        password,
      });
      setUser(res.data.user);
      setAccessToken(res.data.accessToken);
      router.push('/dashboard');
    },
    [router]
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await api.post<AuthResponse>('/api/auth/register', {
        email,
        password,
        name,
      });
      setUser(res.data.user);
      setAccessToken(res.data.accessToken);
      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Logout endpoint might fail — clear state anyway
    }
    setUser(null);
    setAccessToken(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, register, logout }}
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
