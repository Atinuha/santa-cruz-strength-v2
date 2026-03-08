import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, getMe } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('scs_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('scs_token');
    if (token) {
      getMe()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('scs_user', JSON.stringify(res.data));
        })
        .catch(() => {
          localStorage.removeItem('scs_token');
          localStorage.removeItem('scs_user');
          setUser(null);
        })
        .finally(() => setInitialized(true));
    } else {
      setInitialized(true);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      const { access_token, user: userData } = res.data;
      localStorage.setItem('scs_token', access_token);
      localStorage.setItem('scs_user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('scs_token');
    localStorage.removeItem('scs_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, initialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
