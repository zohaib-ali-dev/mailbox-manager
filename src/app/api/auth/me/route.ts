import { requireViewer } from '@/server/auth/guards';
import { ok, route } from '@/server/http';
import { toUserDto } from '@/server/mappers/user.mapper';

export const GET = route(async () => {
  const viewer = await requireViewer();
  return ok({ user: toUserDto(viewer) });
});
