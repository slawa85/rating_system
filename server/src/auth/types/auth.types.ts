export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  accessToken: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}
