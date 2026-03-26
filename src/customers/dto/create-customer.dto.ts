import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;
