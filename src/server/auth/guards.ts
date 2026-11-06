import 'server-only';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
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

/** The path being rendered (forwarded by src/proxy.ts), used for `?next=` after login. */
async function currentPath(): Promise<string> {
  const path = (await headers()).get('x-mm-path');
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/';
}

/**
 * For server pages and layouts: the viewer, or a redirect to /login?next=<current path>. Pages
 * call it too (not only the layout), because layouts are not re-rendered on client navigation.
 */
export async function requirePageViewer(): Promise<Viewer> {
  const viewer = await getCurrentViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(await currentPath())}`);
  return viewer;
}

/** For admin pages: non-admins get the 404 page, so the admin area is not revealed. */
export async function requirePageAdmin(): Promise<Viewer> {
  const viewer = await requirePageViewer();
  if (viewer.role !== 'ADMIN') notFound();
  return viewer;
}

/** For customer-only pages: admins are sent to their own list. */
export async function requirePageCustomer(): Promise<Viewer> {
  const viewer = await requirePageViewer();
  if (viewer.role !== 'CUSTOMER') redirect('/admin/orders');
  return viewer;
}

/** Where a viewer lands after login or when opening `/`. */
export function homePathFor(viewer: Pick<Viewer, 'role'>): string {
  return viewer.role === 'ADMIN' ? '/admin/orders' : '/orders';
}
