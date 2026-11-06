import { requireAdmin } from '@/server/auth/guards';
import { getContainer } from '@/server/container';
import { ok, route, searchParamsOf } from '@/server/http';

/** GET /api/admin/orders?status&provider&page&pageSize */
export const GET = route(async (request) => {
  const viewer = await requireAdmin();
  const { orderService } = (await getContainer()).services;
  const { items, meta } = await orderService.listOrdersForAdmin(viewer, searchParamsOf(request));
  return ok(items, meta);
});
