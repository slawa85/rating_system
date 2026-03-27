import { Container } from './Container';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <Container>
        <div className="py-8">
          <p className="text-center text-sm text-gray-600">
            © {currentYear} {import.meta.env.VITE_APP_NAME || 'Product Reviews'}. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
