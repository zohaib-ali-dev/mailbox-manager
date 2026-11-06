import type { z } from 'zod';
import { ValidationError, type ValidationIssue } from './errors';

/** Zod issues -> `[{ path, message }]`. Never echoes input values. */
export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

/** Parses with the schema or throws a ValidationError carrying field details. */
export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(toValidationIssues(result.error));
  return result.data;
}
