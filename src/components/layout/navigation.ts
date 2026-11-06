import type { Role } from '@/shared/constants';

export interface NavItem {
  href: string;
  label: string;
  /** Returns true when the item should look active for the current path. */
  isActive: (pathname: string) => boolean;
}

/** Navigation by role. Customers: My orders, New order. Admins: All orders. */
export function navItemsFor(role: Role): NavItem[] {
  if (role === 'ADMIN') {
    return [
      {
        href: '/admin/orders',
        label: 'All orders',
        isActive: (p) => p.startsWith('/admin/orders') || p.startsWith('/orders/'),
      },
    ];
  }
  return [
    {
      href: '/orders',
      label: 'My orders',
      isActive: (p) => p === '/orders' || (p.startsWith('/orders/') && p !== '/orders/new'),
    },
    { href: '/orders/new', label: 'New order', isActive: (p) => p === '/orders/new' },
  ];
}
