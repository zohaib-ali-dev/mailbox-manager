'use client';

import AddIcon from '@mui/icons-material/Add';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { ApiError, apiRequest } from '@/lib/api-client';
import { pluralize } from '@/lib/format';
import {
  IDEMPOTENCY_KEY_HEADER,
  MAX_MAILBOXES,
  MIN_MAILBOXES,
  type Provider,
} from '@/shared/constants';
import { createOrderSchema, domainSchema, mailboxCountSchema } from '@/shared/schemas/order.schema';
import type { OrderDetail } from '@/shared/types/order.dto';
import { tokens } from '@/styles/theme';
import { useIdempotencyKey } from '../hooks/useIdempotencyKey';
import { PROVIDER_LABELS } from './ProviderChip';
import { ProviderPicker } from './ProviderPicker';

type Field = 'domain' | 'provider' | 'mailboxCount';
type FieldErrors = Partial<Record<Field, string>>;

const QUICK_COUNTS = [1, 5, 10, 25, 50] as const;

/**
 * The count field is text: an empty field must be an error (never a silent 0), and "2.5", "-1"
 * or "abc" must reach the shared schema as what they are.
 */
function parseCount(raw: string): { value?: number; error?: string } {
  const trimmed = raw.trim();
  if (trimmed === '')
    return { error: `Enter how many mailboxes you need (${MIN_MAILBOXES} to ${MAX_MAILBOXES}).` };
  const result = mailboxCountSchema.safeParse(Number(trimmed));
  return result.success
    ? { value: result.data }
    : { error: result.error.issues[0]?.message ?? 'Invalid count.' };
}

/** Validates one field with the shared schema; returns its message or undefined. */
function validateDomain(raw: string): { value?: string; error?: string } {
  const result = domainSchema.safeParse(raw);
  return result.success ? { value: result.data } : { error: result.error.issues[0]?.message };
}

/**
 * Idempotent create-order form. Validates with the shared schema on blur and submit, maps server
 * field errors back to the fields, cannot submit twice, and resends the same Idempotency-Key when
 * the same order is resubmitted after a failure, so a retry never creates a duplicate.
 */
export function CreateOrderForm() {
  const router = useRouter();
  const notify = useNotify();
  const { keyFor, renew } = useIdempotencyKey();
  const [domain, setDomain] = useState('');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [count, setCount] = useState('1');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);
  const domainRef = useRef<HTMLInputElement>(null);
  const countRef = useRef<HTMLInputElement>(null);

  const parsedDomain = validateDomain(domain);
  const parsedCount = parseCount(count);
  const summary =
    parsedDomain.value && parsedCount.value && provider
      ? `You are ordering ${pluralize(parsedCount.value, `${PROVIDER_LABELS[provider]} mailbox`, `${PROVIDER_LABELS[provider]} mailboxes`)} for ${parsedDomain.value}`
      : null;

  /** Clears a field's error as soon as the user edits it. */
  const clearError = (field: Field) =>
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  /** Validates everything, posts once, and navigates to the new order on 201 or 200 (replay). */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setFormError(null);

    const next: FieldErrors = {
      domain: parsedDomain.error,
      provider: provider ? undefined : 'Choose Google or Microsoft.',
      mailboxCount: parsedCount.error,
    };
    if (next.domain || next.provider || next.mailboxCount) {
      setErrors(next);
      if (next.domain) domainRef.current?.focus();
      else if (next.mailboxCount) countRef.current?.focus();
      return;
    }

    const payload = createOrderSchema.parse({
      domain: parsedDomain.value,
      provider,
      mailboxCount: parsedCount.value,
    });
    setDomain(payload.domain);
    setErrors({});
    inFlight.current = true;
    setPending(true);
    try {
      const { data, response } = await apiRequest<OrderDetail>('/api/orders', {
        method: 'POST',
        body: payload,
        headers: { [IDEMPOTENCY_KEY_HEADER]: keyFor(payload) },
      });
      renew();
      notify(
        response.status === 201
          ? `Order placed: ${pluralize(data.mailboxCount, `${PROVIDER_LABELS[data.provider]} mailbox`, `${PROVIDER_LABELS[data.provider]} mailboxes`)} for ${data.domain}. Provisioning starts now.`
          : 'This order was already placed. Showing it now.',
      );
      router.push(`/orders/${data.id}`);
    } catch (error) {
      inFlight.current = false;
      setPending(false);
      if (!(error instanceof ApiError)) {
        setFormError(
          'Something went wrong. Submitting again is safe and will not create a duplicate.',
        );
        return;
      }
      if (error.code === 'VALIDATION_ERROR' && error.fieldIssues.length > 0) {
        const mapped: FieldErrors = {};
        for (const issue of error.fieldIssues) {
          const field = issue.path.split('.')[0] as Field;
          if (field === 'domain' || field === 'provider' || field === 'mailboxCount')
            mapped[field] ??= issue.message;
        }
        setErrors(mapped);
        if (Object.keys(mapped).length === 0) setFormError(error.message);
      } else if (error.code === 'IDEMPOTENCY_KEY_MISMATCH') {
        renew();
        setFormError(
          'This order changed since the last attempt. Check the details and submit again.',
        );
      } else if (error.code === 'UNAUTHENTICATED') {
        setFormError('Your session has expired. Sign in again to place the order.');
        router.refresh();
      } else if (error.kind === 'network' || error.status >= 500) {
        setFormError(
          `${error.message} Submitting again is safe: it will not create a duplicate order.`,
        );
      } else {
        setFormError(error.message);
      }
    }
  }

  return (
    <Card component="form" noValidate onSubmit={handleSubmit} aria-busy={pending}>
      <Stack spacing={3.5} sx={{ p: { xs: 2.5, sm: 4 } }}>
        {formError ? (
          <Alert severity="error" role="alert">
            {formError}
          </Alert>
        ) : null}

        <TextField
          label="Domain"
          name="domain"
          value={domain}
          inputRef={domainRef}
          placeholder="example.com"
          autoComplete="off"
          autoFocus
          onChange={(event) => {
            setDomain(event.target.value);
            clearError('domain');
          }}
          onBlur={() => {
            if (domain.trim() === '') return;
            if (parsedDomain.value) setDomain(parsedDomain.value);
            else setErrors((current) => ({ ...current, domain: parsedDomain.error }));
          }}
          error={Boolean(errors.domain)}
          helperText={
            errors.domain ?? 'Only the domain, e.g. example.com. Mailboxes are created on it.'
          }
          slotProps={{
            htmlInput: {
              spellCheck: false,
              autoCapitalize: 'none',
              inputMode: 'url',
              maxLength: 260,
            },
          }}
        />

        <ProviderPicker
          value={provider}
          onChange={(value) => {
            setProvider(value);
            clearError('provider');
          }}
          error={errors.provider}
        />

        <Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: { sm: 'flex-start' } }}
          >
            <TextField
              label="Mailboxes"
              name="mailboxCount"
              value={count}
              inputRef={countRef}
              onChange={(event) => {
                setCount(event.target.value);
                clearError('mailboxCount');
              }}
              onBlur={() =>
                setErrors((current) => ({ ...current, mailboxCount: parseCount(count).error }))
              }
              error={Boolean(errors.mailboxCount)}
              helperText={errors.mailboxCount ?? `${MIN_MAILBOXES} to ${MAX_MAILBOXES}`}
              sx={{
                maxWidth: { sm: 180 },
                '& .MuiFormHelperText-root': { whiteSpace: { sm: 'nowrap' } },
              }}
              slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'off', maxLength: 6 } }}
            />
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: 'wrap', pt: { sm: 1 } }}
              aria-label="Quick picks"
            >
              {QUICK_COUNTS.map((value) => {
                const selected = parsedCount.value === value;
                return (
                  <Chip
                    key={value}
                    label={value}
                    clickable
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    aria-pressed={selected}
                    onClick={() => {
                      setCount(String(value));
                      clearError('mailboxCount');
                    }}
                    sx={{ minWidth: 48, fontVariantNumeric: 'tabular-nums' }}
                  />
                );
              })}
            </Stack>
          </Stack>
        </Box>
      </Stack>

      <Divider />
      <Box
        sx={(theme) => ({
          px: { xs: 2.5, sm: 4 },
          py: 2.5,
          bgcolor: tokens(theme).orders.statCardBg,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
        })}
      >
        <Typography
          variant="body2"
          aria-live="polite"
          sx={{
            color: summary ? 'text.primary' : 'text.secondary',
            fontWeight: summary ? 600 : 400,
          }}
        >
          {summary ?? 'Enter a domain, choose a provider and a count to see your order.'}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0, justifyContent: 'flex-end' }}>
          <Button
            component={NextLink}
            href="/orders"
            color="inherit"
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={pending}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          >
            {pending ? 'Placing order' : 'Place order'}
          </Button>
        </Stack>
      </Box>
    </Card>
  );
}
