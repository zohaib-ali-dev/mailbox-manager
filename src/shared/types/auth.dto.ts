import type { Role } from '@/shared/constants';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
}
