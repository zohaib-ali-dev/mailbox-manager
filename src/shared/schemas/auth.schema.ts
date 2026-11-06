import { z } from 'zod';

export const loginSchema = z.strictObject({
  email: z
    .string({ error: 'Enter your email address.' })
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address.').max(254, 'Email address is too long.')),
  // Never trimmed: spaces can be part of a password.
  password: z
    .string({ error: 'Enter your password.' })
    .min(1, 'Enter your password.')
    .max(200, 'Password is too long.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
