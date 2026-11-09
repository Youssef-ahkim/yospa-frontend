'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

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
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage on mount
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

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('yospa_token', newToken);
    setToken(newToken);
    setUser(newUser);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      if (token) {
        await apiFetch('/logout', { method: 'POST', token });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('yospa_token');
      setToken(null);
      setUser(null);
      router.push('/login');
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