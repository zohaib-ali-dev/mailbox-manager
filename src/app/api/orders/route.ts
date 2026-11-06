import { requireCustomer } from '@/server/auth/guards';
import { getContainer } from '@/server/container';
import { IdempotencyKeyRequiredError } from '@/server/domain/errors';
import { assertSameOrigin, created, ok, readJsonBody, route, searchParamsOf } from '@/server/http';
import { IDEMPOTENCY_KEY_HEADER, IDEMPOTENT_REPLAYED_HEADER } from '@/shared/constants';
import { createOrderSchema, idempotencyKeySchema } from '@/shared/schemas/order.schema';

/** GET /api/orders: the customer's own orders, paginated. */
export const GET = route(async (request) => {
  const viewer = await requireCustomer();
  const { orderService } = (await getContainer()).services;
  const { items, meta } = await orderService.listOrdersForCustomer(viewer, searchParamsOf(request));
  return ok(items, meta);
});

/** POST /api/orders: idempotent create. 201 for a new order, 200 for a replay. */
export const POST = route(async (request) => {
  assertSameOrigin(request);
  const viewer = await requireCustomer();
  const key = idempotencyKeySchema.safeParse(request.headers.get(IDEMPOTENCY_KEY_HEADER));
  if (!key.success) throw new IdempotencyKeyRequiredError();
  const input = await readJsonBody(request, createOrderSchema);

  const { orderService } = (await getContainer()).services;
  const { order, replayed } = await orderService.createOrder(viewer, input, key.data);
  const headers = { [IDEMPOTENT_REPLAYED_HEADER]: String(replayed) };
  return replayed ? ok(order, undefined, headers) : created(order, headers);
});
