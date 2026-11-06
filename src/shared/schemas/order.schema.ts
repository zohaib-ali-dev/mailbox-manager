import { z } from 'zod';
import {
  DEFAULT_PAGE_SIZE,
  IDEMPOTENCY_KEY_MAX_LENGTH,
  IDEMPOTENCY_KEY_MIN_LENGTH,
  MAX_MAILBOXES,
  MAX_PAGE_SIZE,
  MIN_MAILBOXES,
  ORDER_STATUSES,
  PROVIDERS,
} from '@/shared/constants';

const MAX_DOMAIN_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const LABEL_CHARS = /^[a-z0-9-]+$/;
const ALPHA_TLD = /^[a-z]{2,63}$/;
const PUNYCODE_TLD = /^xn--[a-z0-9-]+$/;

/** Returns a user-facing problem with an already trimmed, lowercased domain, or null when valid. */
export function describeDomainProblem(domain: string): string | null {
  if (domain.length === 0) return 'Enter a domain, for example example.com.';
  if (/^[a-z][a-z0-9+.-]*:\/\//.test(domain))
    return 'Enter only the domain, without http:// or https:// in front.';
  if (domain.includes('@')) return 'Enter a domain, not an email address.';
  if (domain.includes('/')) return 'Enter only the domain, without a path.';
  if (domain.includes('*')) return 'Wildcard domains are not supported.';
  if (/\s/.test(domain)) return 'A domain cannot contain spaces.';
  if (domain.includes(':') || domain.startsWith('['))
    return domain.split(':').length > 2
      ? 'Enter a domain name, not an IP address.'
      : 'Enter the domain without a port.';
  if (IPV4.test(domain)) return 'Enter a domain name, not an IP address.';
  if (/[^\x00-\x7f]/.test(domain))
    return 'Use the punycode form of international domains, e.g. xn--mnchen-3ya.de.';
  if (domain.length > MAX_DOMAIN_LENGTH)
    return `A domain can be at most ${MAX_DOMAIN_LENGTH} characters long.`;

  const labels = domain.split('.');
  if (labels.length < 2) return 'Enter a full domain, for example example.com.';
  for (const label of labels) {
    if (label.length === 0) return 'A domain cannot contain empty parts or two dots in a row.';
    if (label.length > MAX_LABEL_LENGTH)
      return `Each part of a domain can be at most ${MAX_LABEL_LENGTH} characters long.`;
    if (!LABEL_CHARS.test(label))
      return 'A domain can only contain letters, digits, hyphens and dots.';
    if (label.startsWith('-') || label.endsWith('-'))
      return 'Parts of a domain cannot start or end with a hyphen.';
  }
  const tld = labels[labels.length - 1] ?? '';
  if (!ALPHA_TLD.test(tld) && !PUNYCODE_TLD.test(tld))
    return 'The domain must end with a valid extension such as .com.';
  return null;
}

/** trim -> lowercase -> strip one trailing dot -> validate. */
export const domainSchema = z
  .string({ error: 'Enter a domain, for example example.com.' })
  .trim()
  .toLowerCase()
  .transform((value) => (value.endsWith('.') ? value.slice(0, -1) : value))
  .superRefine((value, ctx) => {
    const problem = describeDomainProblem(value);
    if (problem) ctx.addIssue({ code: 'custom', message: problem });
  });

export const providerSchema = z.enum(PROVIDERS, { error: 'Choose Google or Microsoft.' });

/** No coercion: the string "5" and the boolean true are rejected. */
export const mailboxCountSchema = z
  .number({ error: 'Mailbox count must be a number.' })
  .int('Mailbox count must be a whole number.')
  .min(MIN_MAILBOXES, `Order at least ${MIN_MAILBOXES} mailbox.`)
  .max(MAX_MAILBOXES, `You can order at most ${MAX_MAILBOXES} mailboxes at once.`);

export const createOrderSchema = z.strictObject({
  domain: domainSchema,
  provider: providerSchema,
  mailboxCount: mailboxCountSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateOrderFormValues = z.input<typeof createOrderSchema>;

export const idempotencyKeySchema = z
  .string({ error: 'Idempotency-Key is required.' })
  .regex(
    new RegExp(`^[A-Za-z0-9_-]{${IDEMPOTENCY_KEY_MIN_LENGTH},${IDEMPOTENCY_KEY_MAX_LENGTH}}$`),
    `Idempotency-Key must be ${IDEMPOTENCY_KEY_MIN_LENGTH} to ${IDEMPOTENCY_KEY_MAX_LENGTH} letters, digits, "-" or "_".`,
  );

/** Missing or empty query values fall back to their defaults. */
const blankToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const pageSchema = z.preprocess(
  blankToUndefined,
  z.coerce
    .number({ error: 'Page must be a number.' })
    .int('Page must be a whole number.')
    .min(1, 'Page must be 1 or more.')
    .default(1),
);

const pageSizeSchema = z.preprocess(
  blankToUndefined,
  z.coerce
    .number({ error: 'Page size must be a number.' })
    .int('Page size must be a whole number.')
    .min(1, 'Page size must be 1 or more.')
    .max(MAX_PAGE_SIZE, `Page size can be at most ${MAX_PAGE_SIZE}.`)
    .default(DEFAULT_PAGE_SIZE),
);

export const orderListQuerySchema = z.strictObject({
  page: pageSchema,
  pageSize: pageSizeSchema,
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

/** An empty string or "all" means "no filter". */
const allToUndefined = (value: unknown) => (value === '' || value === 'all' ? undefined : value);

export const adminOrderListQuerySchema = z.strictObject({
  page: pageSchema,
  pageSize: pageSizeSchema,
  status: z.preprocess(
    allToUndefined,
    z.enum(ORDER_STATUSES, { error: 'Unknown status filter.' }).optional(),
  ),
  provider: z.preprocess(
    allToUndefined,
    z.enum(PROVIDERS, { error: 'Unknown provider filter.' }).optional(),
  ),
});

export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;
