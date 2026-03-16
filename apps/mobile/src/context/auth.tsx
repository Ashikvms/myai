import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'pro';
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, _password: string) => {
    setIsLoading(true);
    try {
      // Mock login — replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setUser({
        id: '1',
        name: email.split('@')[0],
        email,
        plan: 'free',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, _password: string) => {
    setIsLoading(true);
    try {
      // Mock signup — replace with real API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setUser({
        id: '1',
        name,
        email,
        plan: 'free',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
