/**
 * AuthProvider — real JWT auth wired to the BillBee API.
 *
 * - Hydrates the user from SecureStore on mount via `/api/auth/me`.
 * - login / signup POST to `/api/auth/{login,register}` and persist
 *   the access token to SecureStore via `setToken()`.
 * - logout clears the token + user; refresh-token revocation is best-
 *   effort (mobile can't use HttpOnly cookies; cookie path is a no-op
 *   here so we just discard the access token locally).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api, setToken, removeToken } from '../lib/api';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  plan: string;
  onboardingComplete: boolean;
};

type AuthEnvelope = {
  success: boolean;
  data: { user: User; accessToken: string };
};

type MeEnvelope = {
  success: boolean;
  data: { user: User };
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  /** True until the initial /me hydrate finishes. */
  isHydrating: boolean;
  /** True while a login/signup request is in flight. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Hydrate from SecureStore on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<MeEnvelope>('/api/auth/me');
        if (!cancelled) setUser(res.data.user);
      } catch {
        // No / invalid token — clear it so future requests skip auth header.
        await removeToken();
      } finally {
        if (!cancelled) setIsHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.post<AuthEnvelope>('/api/auth/login', {
        email,
        password,
      });
      await setToken(res.data.accessToken);
      setUser(res.data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await api.post<AuthEnvelope>('/api/auth/register', {
          name,
          email,
          password,
        });
        await setToken(res.data.accessToken);
        setUser(res.data.user);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      // Best-effort server logout; ignore failures.
      await api.post('/api/auth/logout', {});
    } catch {
      // ignore
    }
    await removeToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isHydrating,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
