import { createContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '@/api/endpoints/auth.api';
import { readStoredAuthToken } from '@/shared/utils/authToken';
import type { Customer, LoginDto, RegisterDto } from '../types/auth.types';

interface AuthContextType {
  user: Customer | null;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = readStoredAuthToken();
      if (!token) {
        localStorage.removeItem('authToken');
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
      } catch {
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  const login = async (data: LoginDto) => {
    const response = await authApi.login(data);
    localStorage.setItem('authToken', response.accessToken);
    setUser(response.customer);
  };

  const register = async (data: RegisterDto) => {
    const response = await authApi.register(data);
    localStorage.setItem('authToken', response.accessToken);
    setUser(response.customer);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
