import { startSession } from '@/server/auth/session';
import { getContainer } from '@/server/container';
import { assertSameOrigin, ok, readJsonBody, route } from '@/server/http';
import { loginSchema } from '@/shared/schemas/auth.schema';

export const POST = route(async (request) => {
  assertSameOrigin(request);
  const input = await readJsonBody(request, loginSchema);
  const user = await (await getContainer()).services.authService.login(input);
  await startSession(user);
  return ok({ user });
});
