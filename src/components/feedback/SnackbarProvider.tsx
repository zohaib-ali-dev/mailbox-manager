'use client';

import Alert, { type AlertColor } from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Notify = (message: string, severity?: AlertColor) => void;

const NotifyContext = createContext<Notify>(() => {});

interface Toast {
  id: number;
  message: string;
  severity: AlertColor;
}

/**
 * One app-wide snackbar. Lives in the shell, so a message survives client navigation (for
 * example "Order created" shown on the detail page after the form navigates there).
 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback<Notify>((message, severity = 'success') => {
    setToast({ id: Date.now(), message, severity });
    setOpen(true);
  }, []);

  const value = useMemo(() => notify, [notify]);

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.id}
        open={open}
        autoHideDuration={toast?.severity === 'error' ? 8000 : 4000}
        onClose={(_event, reason) => {
          if (reason !== 'clickaway') setOpen(false);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 24 } }}
      >
        {toast ? (
          <Alert
            onClose={() => setOpen(false)}
            severity={toast.severity}
            variant="filled"
            role={toast.severity === 'error' ? 'alert' : 'status'}
            sx={{ minWidth: { sm: 360 }, boxShadow: 6 }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifyContext.Provider>
  );
}

/** Shows a snackbar message: `notify('Order created')`, `notify(error.message, 'error')`. */
export function useNotify(): Notify {
  return useContext(NotifyContext);
}
