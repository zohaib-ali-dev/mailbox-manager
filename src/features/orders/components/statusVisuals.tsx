import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import type { SvgIconComponent } from '@mui/icons-material';
import type { OrderStatus } from '@/shared/constants';

type StatusTokenPrefix = 'pending' | 'provisioning' | 'active' | 'failed';

/**
 * The status -> label, icon and token mapping from COLOR_SYSTEM.md. The ONLY place it exists;
 * every status chip reads it. Mailbox statuses are a subset of order statuses.
 */
export const STATUS_VISUALS: Record<
  OrderStatus,
  { label: string; Icon: SvgIconComponent; token: StatusTokenPrefix }
> = {
  PENDING: { label: 'Pending', Icon: HourglassEmptyIcon, token: 'pending' },
  PROVISIONING: { label: 'Provisioning', Icon: AutorenewIcon, token: 'provisioning' },
  ACTIVE: { label: 'Active', Icon: CheckCircleIcon, token: 'active' },
  FAILED: { label: 'Failed', Icon: ErrorOutlineIcon, token: 'failed' },
};
