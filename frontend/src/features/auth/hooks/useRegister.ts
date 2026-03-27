import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import type { RegisterDto } from '../types/auth.types';

export const useRegister = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: RegisterDto) => register(data),
    onSuccess: () => {
      navigate('/');
    },
  });
};
