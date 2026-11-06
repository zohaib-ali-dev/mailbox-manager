import type { Role } from '@/shared/constants';

/** The signed-in user a use case acts for. */
export interface Viewer {
  id: string;
  email: string;
  name: string;
  role: Role;
}
