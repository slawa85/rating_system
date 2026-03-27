import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['test', 'development', 'staging', 'production'])
      .default('development'),
    DATABASE_URL: z.string().min(1),
    PORT: z.coerce.number().default(3000),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRATION: z
      .string()
      .regex(/^\d+[smhd]$/, 'Must be a valid duration (e.g. 30m, 1h, 7d)')
      .default('1h'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
      .optional(),
  })
  .transform((config) => ({
    ...config,
    LOG_LEVEL:
      config.LOG_LEVEL ??
      (config.NODE_ENV === 'production'
        ? 'warn'
        : config.NODE_ENV === 'test'
          ? 'error'
          : config.NODE_ENV === 'staging'
            ? 'info'
            : 'debug'),
  }));

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${details}`);
  }
  return result.data;
}
