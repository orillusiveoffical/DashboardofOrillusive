import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string, currency = 'USD'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(num);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName ? firstName.charAt(0) : '';
  const l = lastName ? lastName.charAt(0) : '';
  return `${f}${l}`.toUpperCase() || 'U';
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    AVAILABLE: 'bg-emerald-100 text-emerald-800',
    OCCUPIED: 'bg-blue-100 text-blue-800',
    MAINTENANCE: 'bg-amber-100 text-amber-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    CHECKED_IN: 'bg-emerald-100 text-emerald-800',
    CHECKED_OUT: 'bg-slate-100 text-slate-700',
    CANCELLED: 'bg-red-100 text-red-800',
    NO_SHOW: 'bg-orange-100 text-orange-800',
    available: 'bg-emerald-50',
    booked: 'bg-blue-200',
    blocked: 'bg-amber-200',
    maintenance: 'bg-slate-300',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

export function canManageUsers(role: string): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}

export function canManageSettings(role: string): boolean {
  return role === 'OWNER' || role === 'MANAGER';
}
