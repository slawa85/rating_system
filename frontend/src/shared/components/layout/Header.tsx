import { Link } from 'react-router-dom';
import { Container } from './Container';
import { Button } from '../ui/Button';

interface HeaderProps {
  user?: { name: string } | null;
  onLogout?: () => void;
}

export function Header({ user, onLogout }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200">
      <Container>
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold text-blue-600">
            {import.meta.env.VITE_APP_NAME || 'Product Reviews'}
          </Link>

          <nav className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600">
                  Hello, <span className="font-medium">{user.name}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={onLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </Container>
    </header>
  );
}
