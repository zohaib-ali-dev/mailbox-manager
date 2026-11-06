import { endSession } from '@/server/auth/session';
import { assertJsonIfBody, assertSameOrigin, ok, route } from '@/server/http';

export const POST = route(async (request) => {
  assertSameOrigin(request);
  await assertJsonIfBody(request);
  await endSession();
  return ok({ ok: true });
});
