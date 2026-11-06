import type { Role } from '@/shared/constants';

/** The seeded demo logins (prisma/seed.ts). Shown on /login only when SHOW_DEMO_CREDENTIALS is true. */
export const DEMO_ACCOUNTS: readonly {
  label: string;
  email: string;
  password: string;
  role: Role;
}[] = [
  { label: 'Admin', email: 'admin@example.com', password: 'Admin123!', role: 'ADMIN' },
  { label: 'Customer', email: 'customer@example.com', password: 'Customer123!', role: 'CUSTOMER' },
  {
    label: 'Second customer',
    email: 'customer2@example.com',
    password: 'Customer123!',
    role: 'CUSTOMER',
  },
];
