export interface StandardErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  errors?: { path: (string | number)[]; message: string }[];
  traceId: string;
}
