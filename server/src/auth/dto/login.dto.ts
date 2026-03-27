import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1),
});

export type LoginDto = z.infer<typeof loginSchema>;
