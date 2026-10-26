import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '../types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  isAsesor: boolean;
  login: (usuario: string, clave: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  cambiarClave: (nuevaClave: string) => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch('/api/yo', {
        credentials: 'include',
      });
      if (res.ok) {
        const userData: AuthUser = await res.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.warn('Error verificando sesión actual:', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (usuario: string, clave: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ usuario, password: clave }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'usuario o contraseña incorrectos',
        };
      }

      setUser(data.user);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error de conexión con el servidor',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    } finally {
      setUser(null);
    }
  };

  const cambiarClave = async (nuevaClave: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/cambiar-clave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nuevaClave }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'No se pudo cambiar la contraseña',
        };
      }

      if (data.user) {
        setUser(data.user);
      } else if (user) {
        setUser({ ...user, debeCambiarClave: false });
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Error de conexión con el servidor',
      };
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const isAdmin = user?.rol === 'administrador';
  const isAsesor = user?.rol === 'asesor';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isAsesor,
        login,
        logout,
        cambiarClave,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
