import type { z } from 'zod';
import { ValidationError, type ValidationIssue } from './errors';

/** Zod issues -> `[{ path, message }]`. Never echoes input values; unknown keys get one entry each. */
export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.flatMap((issue) => {
    const base = issue.path.map(String);
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({
        path: [...base, key].join('.'),
        message: 'Unknown field.',
      }));
    }
    return [{ path: base.join('.'), message: issue.message }];
  });
}

/** Parses with the schema or throws a ValidationError carrying field details. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(toValidationIssues(result.error));
  return result.data;
}
