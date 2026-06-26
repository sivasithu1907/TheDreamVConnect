import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { CSSProperties } from 'react';

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

export const COMMON_UNITS = ['pcs', 'box', 'carton', 'kg', 'liter', 'set', 'pack', 'roll'];

export const PAYMENT_TERMS_OPTIONS = ['Immediate Payment', '7 Days', '21 Days', '30 Days', 'Custom'];

// ── Shared inline style objects for the light institutional theme ──────────────
// Used across pages so every input/label/table looks identical without
// repeating the same style object literally everywhere.
export const themeStyles = {
  input: { background: '#fff', border: '1px solid var(--border)', color: 'var(--text-primary)' } as CSSProperties,
  label: { color: 'var(--text-muted)' } as CSSProperties,
  muted: { color: 'var(--text-muted)' } as CSSProperties,
  faint: { color: 'var(--text-faint)' } as CSSProperties,
  primary: { color: 'var(--text-primary)' } as CSSProperties,
  danger: { color: 'var(--danger)' } as CSSProperties,
  errorBox: { color: 'var(--danger)', background: '#FEF2F2' } as CSSProperties,
};

export function statusBadgeStyle(kind: 'success' | 'warning' | 'neutral' | 'info' | 'muted' | 'danger'): CSSProperties {
  switch (kind) {
    case 'success': return { background: '#ECFDF5', color: '#059669' };
    case 'warning': return { background: '#FFFBEB', color: '#D97706' };
    case 'neutral':  return { background: '#F9FAFB', color: '#374151' };
    case 'info':     return { background: '#EFF6FF', color: '#2563EB' };
    case 'muted':    return { background: '#F9FAFB', color: '#9CA3AF' };
    case 'danger':   return { background: '#FEF2F2', color: '#DC2626' };
  }
}
