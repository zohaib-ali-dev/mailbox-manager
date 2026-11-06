import { Prisma } from '@/generated/prisma/client';

/**
 * True when `error` is a unique violation on the given constraint (by name) or on exactly the
 * given columns. The shape of `meta` differs between the native engine and driver adapters, so
 * both are inspected.
 */
export function isUniqueViolation(
  error: unknown,
  constraint: { name: string; fields: readonly string[] },
): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const meta = (error.meta ?? {}) as Record<string, unknown>;
  const target = meta.target;
  if (typeof target === 'string') return target === constraint.name;
  if (Array.isArray(target)) return sameFields(target, constraint.fields);

  const adapterCause = (meta.driverAdapterError as { cause?: Record<string, unknown> } | undefined)
    ?.cause;
  const adapterConstraint = adapterCause?.constraint as
    { fields?: unknown; index?: unknown } | undefined;
  if (adapterConstraint) {
    if (adapterConstraint.index === constraint.name) return true;
    if (Array.isArray(adapterConstraint.fields)) {
      return sameFields(adapterConstraint.fields, constraint.fields);
    }
  }
  return false;
}

function sameFields(actual: unknown[], expected: readonly string[]): boolean {
  const normalise = (value: unknown) => String(value).replaceAll('"', '');
  const got = actual.map(normalise).sort();
  const want = [...expected].sort();
  return got.length === want.length && got.every((field, index) => field === want[index]);
}

export const ORDER_IDEMPOTENCY_CONSTRAINT = {
  name: 'orders_user_id_idempotency_key_key',
  fields: ['user_id', 'idempotency_key'],
} as const;

export const MAILBOX_ADDRESS_CONSTRAINT = {
  name: 'mailboxes_address_key',
  fields: ['address'],
} as const;
