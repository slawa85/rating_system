import { createContext } from 'react';
import type { Customer, LoginDto, RegisterDto } from '../types/auth.types';

export interface AuthContextType {
  user: Customer | null;
  isLoading: boolean;
  login: (data: LoginDto) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);
