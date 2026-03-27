import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@/shared/components/layout/Container';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Container className="py-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Login</h1>
          <p className="text-gray-600 text-center mb-6">Welcome back!</p>
          <LoginForm />
        </div>
      </Container>
    </div>
  );
}
