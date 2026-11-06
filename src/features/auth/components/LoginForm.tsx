'use client';

import LoginIcon from '@mui/icons-material/Login';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { useNotify } from '@/components/feedback/SnackbarProvider';
import { ApiError, apiRequest } from '@/lib/api-client';
import type { UserDto } from '@/shared/types/auth.dto';
import { loginSchema } from '@/shared/schemas/auth.schema';
import { DemoCredentials } from './DemoCredentials';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

/**
 * Email + password sign-in. Validates with the shared schema, shows the server's generic message on
 * failure, and on success goes to the (already sanitised) `next` path and refreshes server data.
 */
export function LoginForm({ next, showDemo }: { next: string; showDemo: boolean }) {
  const router = useRouter();
  const notify = useNotify();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  /** Validates, posts to /api/auth/login and navigates on success. */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if ((key === 'email' || key === 'password') && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const { data } = await apiRequest<{ user: UserDto }>('/api/auth/login', {
        method: 'POST',
        body: parsed.data,
      });
      notify(
        `Welcome back, ${data.user.name.split(' ')[0] || data.user.name}. You are signed in as ${data.user.role === 'ADMIN' ? 'an admin' : 'a customer'}.`,
      );
      router.replace(next);
      router.refresh();
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError) {
        setFormError(error.message);
        if (error.code === 'INVALID_CREDENTIALS') {
          setPassword('');
          passwordRef.current?.focus();
        }
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    }
  }

  /** Fills the form from a demo account and moves focus to the submit button. */
  function useAccount(demoEmail: string, demoPassword: string) {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setFieldErrors({});
    setFormError(null);
  }

  return (
    <>
      <Stack
        component="form"
        noValidate
        onSubmit={handleSubmit}
        spacing={2.25}
        aria-describedby={formError ? 'login-error' : undefined}
      >
        {formError ? (
          <Alert id="login-error" severity="error" role="alert">
            {formError}
          </Alert>
        ) : null}
        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="username"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
          }}
          error={Boolean(fieldErrors.email)}
          helperText={fieldErrors.email}
          required
          autoFocus
          slotProps={{
            htmlInput: {
              inputMode: 'email',
              spellCheck: false,
              autoCapitalize: 'none',
              maxLength: 254,
            },
          }}
        />
        <TextField
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          value={password}
          inputRef={passwordRef}
          onChange={(event) => {
            setPassword(event.target.value);
            if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
          }}
          error={Boolean(fieldErrors.password)}
          helperText={fieldErrors.password}
          required
          slotProps={{
            htmlInput: { maxLength: 200 },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((value) => !value)}
                    edge="end"
                  >
                    {showPassword ? (
                      <VisibilityOff fontSize="small" />
                    ) : (
                      <Visibility fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={pending}
          startIcon={pending ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
        >
          {pending ? 'Signing in' : 'Sign in'}
        </Button>
      </Stack>
      {showDemo ? <DemoCredentials onUse={useAccount} /> : null}
    </>
  );
}
