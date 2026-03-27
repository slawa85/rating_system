/** Matches API: full shape from GET /auth/me; login/register omit optional fields. */
export interface Customer {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

/** Backend returns `accessToken` (not `token`). */
export interface AuthResponse {
  accessToken: string;
  customer: Customer;
}
