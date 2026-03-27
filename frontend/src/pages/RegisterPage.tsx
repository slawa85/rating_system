import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@/shared/components/layout/Container';
import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function RegisterPage() {
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
          <h1 className="text-3xl font-bold mb-2 text-center">Create Account</h1>
          <p className="text-gray-600 text-center mb-6">Join us today!</p>
          <RegisterForm />
        </div>
      </Container>
    </div>
  );
}
