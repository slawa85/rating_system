import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from './routes';
import { Header } from '@/shared/components/layout/Header';
import { Footer } from '@/shared/components/layout/Footer';
import { Spinner } from '@/shared/components/ui/Spinner';
import { useAuth } from '@/features/auth/hooks/useAuth';

const HomePage = lazy(() => import('@/pages/HomePage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export function AppRouter() {
  const { user, logout } = useAuth();

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header user={user} onLogout={logout} />
        
        <main className="flex-1">
          <Suspense
            fallback={
              <div className="flex justify-center items-center min-h-[60vh]">
                <Spinner size="lg" />
              </div>
            }
          >
            <Routes>
              <Route path={ROUTES.HOME} element={<HomePage />} />
              <Route path={ROUTES.PRODUCT_DETAIL} element={<ProductDetailPage />} />
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </BrowserRouter>
  );
}
