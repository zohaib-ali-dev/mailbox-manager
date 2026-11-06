/**
 * Open-redirect protection for `?next=`: only same-site relative paths are accepted. Anything
 * absolute (`https://evil.test`), protocol-relative (`//evil.test`), backslash tricks or control
 * characters fall back to `fallback`.
 */
export function safeNextPath(next: unknown, fallback = '/'): string {
  if (typeof next !== 'string' || next.length === 0 || next.length > 2048) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const url = new URL(next, 'http://same-origin.invalid');
    if (url.origin !== 'http://same-origin.invalid') return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
