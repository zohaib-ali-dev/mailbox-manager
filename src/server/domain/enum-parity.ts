import type {
  MailboxStatus as PrismaMailboxStatus,
  Provider as PrismaProvider,
  Role as PrismaRole,
} from '@/generated/prisma/enums';
import type { MailboxStatus, Provider, Role } from '@/shared/constants';

// Compile-time guard for the enums the state machine does not cover (see order-state-machine.ts).
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type AssertTrue<T extends true> = T;
export type ProviderMatchesPrisma = AssertTrue<Equals<Provider, PrismaProvider>>;
export type MailboxStatusMatchesPrisma = AssertTrue<Equals<MailboxStatus, PrismaMailboxStatus>>;
export type RoleMatchesPrisma = AssertTrue<Equals<Role, PrismaRole>>;
