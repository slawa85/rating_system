import { z } from 'zod';
import { sanitizeText } from '../../common/utils/sanitize.js';

export const registerSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .transform((n) => sanitizeText(n)),
  email: z
    .string()
    .email()
    .max(255)
    .transform((e) => e.toLowerCase().trim()),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
    ),
});

export type RegisterDto = z.infer<typeof registerSchema>;
