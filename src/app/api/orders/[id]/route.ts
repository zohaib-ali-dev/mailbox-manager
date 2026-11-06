import { requireViewer } from '@/server/auth/guards';
import { getContainer } from '@/server/container';
import { ok, route } from '@/server/http';

/** GET /api/orders/:id for the owner or an admin; 404 for anyone else and for malformed ids. */
export const GET = route<RouteContext<'/api/orders/[id]'>>(async (_request, context) => {
  const viewer = await requireViewer();
  const { id } = await context.params;
  const { orderService } = (await getContainer()).services;
  return ok(await orderService.getOrderForViewer(viewer, id));
});
