import { api } from '../client';
import type { AuthResponse, LoginDto, RegisterDto, Customer } from '@/features/auth/types/auth.types';

export const authApi = {
  register: (data: RegisterDto) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: LoginDto) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  getCurrentUser: () =>
    api.get<Customer>('/auth/me'),
};
