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

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@lifeadmin.app',
  name: 'Alex Johnson',
  plan: 'FREE',
  avatarUrl: null,
  onboardingComplete: true,
};

const STORAGE_KEY = 'life-admin-auth';

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/', '/login', '/signup'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Restore session from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // No stored session
    }
    setIsLoading(false);
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
      // Demo auth: accept demo credentials or any valid-looking input
      if (
        (email === 'demo@lifeadmin.app' && password === 'Demo1234!') ||
        (email.includes('@') && password.length >= 8)
      ) {
        const loggedInUser: User = {
          ...DEMO_USER,
          email,
          name: email === 'demo@lifeadmin.app' ? 'Alex Johnson' : email.split('@')[0] || 'User',
        };
        setUser(loggedInUser);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
        router.push('/dashboard');
      } else {
        throw new Error('Invalid email or password');
      }
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      if (!email.includes('@') || password.length < 8 || !name.trim()) {
        throw new Error('Please fill in all fields correctly');
      }
      const newUser: User = {
        ...DEMO_USER,
        id: `user-${Date.now()}`,
        email,
        name,
      };
      setUser(newUser);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
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
