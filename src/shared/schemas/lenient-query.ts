import type { z } from 'zod';

/**
 * Parses URL query values for a page, dropping any value that is invalid instead of failing, so
 * `?status=banana&page=-3` shows the default list rather than an error page. Unknown keys are
 * ignored. Each key is checked on its own against the (strict) schema, then the kept keys are
 * parsed together.
 */
export function parseQueryLeniently<S extends z.ZodType>(
  schema: S,
  raw: Record<string, string | string[] | undefined>,
  keys: readonly string[],
): z.output<S> {
  const kept: Record<string, string> = {};
  for (const key of keys) {
    const value = raw[key];
    const single = Array.isArray(value) ? value[0] : value;
    if (single === undefined) continue;
    if (schema.safeParse({ [key]: single }).success) kept[key] = single;
  }
  return schema.parse(kept);
}
