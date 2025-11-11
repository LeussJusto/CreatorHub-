import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserDTO, LoginPayload } from '../models/User';
import * as authController from '../controllers/auth.controller';

type AuthContextValue = {
  user: UserDTO | null;
  token: string | null;
  initialized: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'creatorhub_auth_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed.user || null);
        setToken(parsed.token || null);
      }
    } catch {}
    setInitialized(true);
  }, []);

  useEffect(() => {
    const payload = { user, token };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [user, token]);

  const login = async (p: LoginPayload) => {
    const res = await authController.login(p);
    setUser(res.user || null);
    setToken(res.token || null);
  };

  const register = async (p: { name: string; email: string; password: string }) => {
    const res = await authController.register(p);
    setUser(res.user || null);
    setToken(res.token || null);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, token, initialized, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Component to protect routes
import { Navigate } from 'react-router-dom';
import Loader from '../components/Loader';

export const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { token, initialized } = useAuth();
  // while we restore auth state from localStorage, show a small loader
  if (!initialized) return <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center'}}><Loader /></div>;
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default AuthContext;
