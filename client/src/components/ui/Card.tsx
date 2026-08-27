import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}

export function Card({ children, className, title, action }: CardProps) {
  return (
    <div className={cn('rounded-3xl border border-[#D2C4B4] bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-[#D2C4B4] px-7 py-5 bg-[#FAF5EF]">
          {title && <h3 className="font-extrabold text-[#1E293B] text-lg tracking-tight">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-7">
        {children}
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: string;
}

export function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-[#D2C4B4] bg-white p-7 shadow-sm hover:shadow-md hover:border-[#81A6C6] transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-[#1E293B] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-slate-600 font-medium">{subtitle}</p>}
          {trend && <p className="text-xs text-emerald-700 font-bold">{trend}</p>}
        </div>
        {icon && (
          <div className="rounded-2xl bg-[#AACDDC]/30 p-3.5 text-[#81A6C6] border border-[#81A6C6]/20 shadow-xs">{icon}</div>
        )}
      </div>
    </div>
  );
}
