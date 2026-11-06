'use client';

import type { OrderStatus } from '@/shared/constants';
import { StatusChip } from './StatusChip';

/** Order status chip (Pending, Provisioning, Active, Failed) from the status tokens. */
export function OrderStatusChip({
  status,
  size,
}: {
  status: OrderStatus;
  size?: 'small' | 'medium';
}) {
  return <StatusChip status={status} size={size} />;
}
