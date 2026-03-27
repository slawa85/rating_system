import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { LoginDto } from '../types/auth.types';

export const useLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: LoginDto) => login(data),
    onSuccess: () => {
      navigate('/');
    },
  });
};
