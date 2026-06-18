import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin:                  'Super Admin',
  inventory_manager:            'Inventory Manager',
  sales_manager:                'Sales Manager',
  operations_executive:         'Operations Executive',
  client_admin:                 'Client Admin',
  client_purchasing_officer:    'Purchasing Officer',
  client_viewer:                'Viewer',
};
