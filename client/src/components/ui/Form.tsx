import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  children: ReactNode;
}

const variants = {
  primary: 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#81A6C6] hover:bg-[#6C93B5] text-sm font-bold text-white shadow-sm transition duration-150 active:scale-[0.98] disabled:opacity-50',
  secondary: 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[#81A6C6]/15 text-sm font-semibold text-[var(--text-primary)] transition duration-150 disabled:opacity-50',
  danger: 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-bold text-white shadow-sm transition duration-150 active:scale-[0.98] disabled:opacity-50',
  ghost: 'inline-flex items-center justify-center h-11 px-4 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition',
};

export function Button({
  variant = 'primary',
  loading,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(variants[variant], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full h-11 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-[#81A6C6] focus:border-transparent',
          error && 'border-rose-500 focus:ring-rose-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full h-11 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:ring-2 focus:ring-[#81A6C6] focus:border-transparent font-medium cursor-pointer',
          error && 'border-rose-500 focus:ring-rose-500',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[var(--bg-card)] text-[var(--text-primary)] py-2">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'w-full min-h-[90px] resize-y rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-[#81A6C6] focus:border-transparent',
          error && 'border-rose-500 focus:ring-rose-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const modalSizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[var(--modal-overlay)] backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative z-10 w-full rounded-3xl bg-[var(--bg-card)] border border-[var(--border)] shadow-2xl overflow-hidden text-[var(--text-primary)]', modalSizes[size])}>
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--bg-surface)] px-7 py-5">
          <h2 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">{title}</h2>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-[#81A6C6]/20 hover:text-[var(--text-primary)] transition">
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-7 text-sm text-[var(--text-primary)]">{children}</div>
      </div>
    </div>
  );
}
