import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import type { SvgIconComponent } from '@mui/icons-material';
import type { OrderStatus } from '@/shared/constants';

type StatusTokenPrefix = 'pending' | 'provisioning' | 'active' | 'failed';

interface StatusVisual {
  label: string;
  Icon: SvgIconComponent;
  token: StatusTokenPrefix;
  /** Tooltip text when the chip describes an order. */
  orderHint: string;
  /** Tooltip text when the chip describes one mailbox. */
  mailboxHint: string;
}

/**
 * The status -> label, icon, token and explanation mapping from COLOR_SYSTEM.md. The ONLY place it
 * exists; every status chip reads it. Mailbox statuses are a subset of order statuses.
 */
export const STATUS_VISUALS: Record<OrderStatus, StatusVisual> = {
  PENDING: {
    label: 'Pending',
    Icon: HourglassEmptyIcon,
    token: 'pending',
    orderHint: 'Waiting for a worker to pick the order up.',
    mailboxHint: 'Not provisioned yet.',
  },
  PROVISIONING: {
    label: 'Provisioning',
    Icon: AutorenewIcon,
    token: 'provisioning',
    orderHint: 'A worker is creating the mailboxes with the provider right now.',
    mailboxHint: 'Being created with the provider.',
  },
  ACTIVE: {
    label: 'Active',
    Icon: CheckCircleIcon,
    token: 'active',
    orderHint: 'Every mailbox in the order is live.',
    mailboxHint: 'Created and ready to use.',
  },
  FAILED: {
    label: 'Failed',
    Icon: ErrorOutlineIcon,
    token: 'failed',
    orderHint: 'At least one mailbox failed. An admin can retry just the failed ones.',
    mailboxHint: 'The provider returned an error. A retry sends only this kind of mailbox again.',
  },
};
