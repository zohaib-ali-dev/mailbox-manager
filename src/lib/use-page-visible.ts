import { useSyncExternalStore } from 'react';

/** Subscribes to tab visibility changes. */
function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/** True while the browser tab is visible (assumed visible during server rendering). */
export function usePageVisible(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === 'visible',
    () => true,
  );
}
