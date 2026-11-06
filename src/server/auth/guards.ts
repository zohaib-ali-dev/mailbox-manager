import 'server-only';
import { cache } from 'react';
import { getContainer } from '@/server/container';
import { ForbiddenError, UnauthorizedError } from '@/server/domain/errors';
import type { Viewer } from '@/server/domain/viewer';
import { readSession } from './session';

/**
 * The signed-in viewer, or null. The user is re-read from the database on every request, so a
 * deleted user is logged out and a changed role applies at once. Deduplicated per request.
 */
export const getCurrentViewer = cache(async (): Promise<Viewer | null> => {
  const session = await readSession();
  if (!session) return null;
  const { authService } = (await getContainer()).services;
  return authService.getViewer(session.userId);
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getCurrentViewer();
  if (!viewer) throw new UnauthorizedError();
  return viewer;
}

export async function requireCustomer(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== 'CUSTOMER') throw new ForbiddenError('This action is for customers only.');
  return viewer;
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (viewer.role !== 'ADMIN') throw new ForbiddenError('This action is for admins only.');
  return viewer;
}
