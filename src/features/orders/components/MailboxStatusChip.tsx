'use client';

import type { MailboxStatus } from '@/shared/constants';
import { StatusChip } from './StatusChip';

/** Mailbox status chip (Pending, Active, Failed); same tokens as orders, mailbox-specific tooltip. */
export function MailboxStatusChip({ status }: { status: MailboxStatus }) {
  return <StatusChip status={status} kind="mailbox" />;
}
