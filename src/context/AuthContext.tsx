'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getSafeRedirectPath, setOnUnauthorizedHandler } from '@/lib/api';

export interface Spa {
  id: number;
  name: string;
  slug: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  spa_id: number | null;
  spa?: Spa | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User, redirectTo?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  // Handler for 401s notified by apiFetch.
  // AuthContext is the single owner of clearing state and redirecting once.
  const handleUnauthorized = useCallback((currentPath?: string) => {
    localStorage.removeItem('yospa_token');
    setToken(null);
    setUser(null);
    setIsLoading(false);

    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      const rawPath = currentPath || (window.location.pathname + window.location.search);
      const safeNext = getSafeRedirectPath(rawPath);
      router.replace(`/login?expired=1&next=${encodeURIComponent(safeNext)}`);
    }
  }, [router]);

  // Register the 401 callback with apiFetch
  useEffect(() => {
    setOnUnauthorizedHandler(handleUnauthorized);
    return () => {
      setOnUnauthorizedHandler(null);
    };
  }, [handleUnauthorized]);

  // Initial session validation on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('yospa_token');
    if (storedToken) {
      setToken(storedToken);
      apiFetch<User>('/user', { token: storedToken })
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('yospa_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Multi-tab sync via storage events (browser fires this only across different tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== 'yospa_token') return;

      const newToken = e.newValue;
      if (!newToken) {
        // Token was removed in another tab -> clear state and redirect to /login once
        setToken(null);
        setUser(null);
        setIsLoading(false);
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          const currentPath = window.location.pathname + window.location.search;
          const safeNext = getSafeRedirectPath(currentPath);
          router.replace(`/login?next=${encodeURIComponent(safeNext)}`);
        }
      } else if (newToken !== token) {
        // Token was changed/updated in another tab -> re-fetch /user with the new token
        setToken(newToken);
        setIsLoading(true);
        apiFetch<User>('/user', { token: newToken })
          .then((userData) => {
            setUser(userData);
          })
          .catch(() => {
            localStorage.removeItem('yospa_token');
            setToken(null);
            setUser(null);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [token, router]);

  const login = (newToken: string, newUser: User, redirectTo?: string) => {
    localStorage.setItem('yospa_token', newToken);
    setToken(newToken);
    setUser(newUser);
    setIsLoading(false);
    const destination = getSafeRedirectPath(redirectTo);
    router.replace(destination);
  };

  const logout = async () => {
    try {
      if (token) {
        await apiFetch('/logout', { method: 'POST', token });
      }
    } catch {
      // Ignore network errors on logout, state must be cleared regardless
    } finally {
      localStorage.removeItem('yospa_token');
      setToken(null);
      setUser(null);
      setIsLoading(false);
      router.replace('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
