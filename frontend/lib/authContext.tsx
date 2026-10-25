'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, getStoredToken, setStoredToken, getStoredUser, setStoredUser } from './api';

export interface User {
  user_id: string;
  name: string;
  email: string;
  college: string;
  department: string;
  role: 'STUDENT' | 'ADMIN';
  is_active: boolean;
  total_skills?: number;
  completed_assignments?: number;
  total_earnings?: number;
  average_rating?: number;
  total_reviews_received?: number;
  reputation_score?: number;
  tasks_completed?: number;
  skills?: any[];
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  quickLogin: (email: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingToken = getStoredToken();
    const existingUser = getStoredUser();

    if (existingToken && existingUser) {
      setToken(existingToken);
      setUser(existingUser);
      // Fetch fresh stats from backend in background
      fetchProfile(existingToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchProfile(authToken?: string) {
    try {
      const profile = await apiRequest('/users/profile', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      setUser(profile);
      setStoredUser(profile);
    } catch (err) {
      console.warn('Could not refresh profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setStoredToken(data.token);
      setUser(data.user);
      setStoredUser(data.user);
      await fetchProfile(data.token);
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(email: string) {
    await login(email, 'password123');
  }

  async function register(formData: any) {
    setLoading(true);
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setToken(data.token);
      setStoredToken(data.token);
      setUser(data.user);
      setStoredUser(data.user);
      await fetchProfile(data.token);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setUser(null);
    setToken(null);
    setStoredToken(null);
    setStoredUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickLogin,
        register,
        logout,
        refreshProfile: () => fetchProfile(token || undefined),
      }}
    >
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
