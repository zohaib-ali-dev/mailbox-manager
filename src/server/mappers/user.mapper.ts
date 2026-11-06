import type { Viewer } from '@/server/domain/viewer';
import type { UserDto } from '@/shared/types/auth.dto';

/** Explicit whitelist: never the password hash or timestamps. */
export function toUserDto(user: Viewer): UserDto {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}
