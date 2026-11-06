'use client';

import type { MailboxStatus } from '@/shared/constants';
import { StatusChip } from './StatusChip';

/** Mailbox status chip (Pending, Active, Failed); same tokens as orders, no Provisioning state. */
export function MailboxStatusChip({ status }: { status: MailboxStatus }) {
  return <StatusChip status={status} />;
}
