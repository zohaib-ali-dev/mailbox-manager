import { requireAdmin } from '@/server/auth/guards';
import { getContainer } from '@/server/container';
import { assertJsonIfBody, assertSameOrigin, ok, route } from '@/server/http';

/** POST /api/admin/orders/:id/retry: FAILED -> PENDING. 409 when the order is not FAILED. */
export const POST = route<RouteContext<'/api/admin/orders/[id]/retry'>>(
  async (request, context) => {
    assertSameOrigin(request);
    const viewer = await requireAdmin();
    await assertJsonIfBody(request);
    const { id } = await context.params;
    const { orderService } = (await getContainer()).services;
    return ok(await orderService.retryOrder(viewer, id));
  },
);
