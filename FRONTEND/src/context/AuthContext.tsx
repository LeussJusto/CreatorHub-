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
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const savedToken = parsed.token;
          const savedUser = parsed.user;
          
          if (savedToken && savedUser) {
            console.log('🔄 Restaurando sesión desde localStorage...');
            // Restaurar sesión inmediatamente desde localStorage
            setUser(savedUser);
            setToken(savedToken);
            
            // Validar el token con el backend en segundo plano (no bloquea la restauración)
            try {
              const userData = await authController.me(savedToken);
              // Si la validación es exitosa, actualizar con datos del backend
              if (userData) {
                setUser(userData);
                console.log('✅ Token válido, sesión restaurada');
              }
            } catch (err: any) {
              // Solo limpiar si es un error 401 (token inválido)
              // Si es un error de red u otro error, mantener la sesión
              if (err?.status === 401) {
                console.warn('❌ Token inválido (401), limpiando sesión:', err);
                localStorage.removeItem(STORAGE_KEY);
                setUser(null);
                setToken(null);
              } else {
                console.warn('⚠️ Error al validar token (no es 401), manteniendo sesión:', err);
                // Mantener la sesión si no es un error 401
              }
            }
          } else {
            setUser(savedUser || null);
            setToken(savedToken || null);
          }
        } else {
          console.log('📭 No hay sesión guardada en localStorage');
        }
      } catch (err) {
        console.error('❌ Error al restaurar sesión:', err);
        // En caso de error de parsing, limpiar todo
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        setUser(null);
        setToken(null);
      } finally {
        setIsRestoring(false);
        setInitialized(true);
      }
    };
    
    restoreSession();
  }, []);

  useEffect(() => {
    // No guardar durante la restauración inicial
    if (isRestoring) return;
    
    // Solo guardar si hay token y user (evitar guardar estado vacío)
    if (user && token) {
      const payload = { user, token };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        console.log('💾 Sesión guardada en localStorage');
      } catch (err) {
        console.error('❌ Error al guardar en localStorage:', err);
      }
    } else if (!user && !token && initialized) {
      // Si ambos son null y ya se inicializó, limpiar localStorage
      try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('🧹 localStorage limpiado');
      } catch {}
    }
  }, [user, token, isRestoring, initialized]);

  // Listener para errores 401 globales (token inválido)
  useEffect(() => {
    const handleTokenInvalid = () => {
      console.warn('Token inválido detectado, limpiando sesión...');
      setUser(null);
      setToken(null);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    };

    window.addEventListener('auth:token-invalid', handleTokenInvalid);
    return () => {
      window.removeEventListener('auth:token-invalid', handleTokenInvalid);
    };
  }, []);

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

  const logout = async () => {
    // Llamar al backend para hacer logout (revocar tokens de integraciones)
    if (token) {
      try {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        });
      } catch (err) {
        console.warn('Error al hacer logout en backend:', err);
      }
    }
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
