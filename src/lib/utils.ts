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

// ── Shared inline style objects, theme-aware via CSS variables ─────────────────
// Used across pages so every input/label/table looks identical without
// repeating the same style object literally everywhere. Every value here
// references a CSS variable (defined per-theme in index.css) rather than a
// literal hex — that's what lets these automatically follow the active
// light/dark theme without each page needing to know which theme is active.
export const themeStyles = {
  input: { background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' } as CSSProperties,
  label: { color: 'var(--text-muted)' } as CSSProperties,
  muted: { color: 'var(--text-muted)' } as CSSProperties,
  faint: { color: 'var(--text-faint)' } as CSSProperties,
  primary: { color: 'var(--text-primary)' } as CSSProperties,
  danger: { color: 'var(--danger)' } as CSSProperties,
  errorBox: { color: 'var(--danger)', background: 'var(--error-box-bg)' } as CSSProperties,
};

export function statusBadgeStyle(kind: 'success' | 'warning' | 'neutral' | 'info' | 'muted' | 'danger'): CSSProperties {
  switch (kind) {
    case 'success': return { background: 'var(--badge-success-bg)', color: 'var(--badge-success-text)' };
    case 'warning': return { background: 'var(--badge-warning-bg)', color: 'var(--badge-warning-text)' };
    case 'neutral':  return { background: 'var(--badge-neutral-bg)', color: 'var(--badge-neutral-text)' };
    case 'info':     return { background: 'var(--badge-info-bg)',    color: 'var(--badge-info-text)' };
    case 'muted':    return { background: 'var(--badge-muted-bg)',   color: 'var(--badge-muted-text)' };
    case 'danger':   return { background: 'var(--badge-danger-bg)',  color: 'var(--badge-danger-text)' };
  }
}
