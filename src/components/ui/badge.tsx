import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline' | 'neutral';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-[#977f5a]/15 text-[#836d4b] border border-[#977f5a]/30',
    success: 'bg-[#15803d]/15 text-[#15803d] border border-[#15803d]/30',
    warning: 'bg-[#b45309]/15 text-[#b45309] border border-[#b45309]/30',
    danger: 'bg-[#b91c1c]/15 text-[#b91c1c] border border-[#b91c1c]/30',
    neutral: 'bg-[#766a5e]/15 text-[#766a5e] border border-[#766a5e]/30',
    outline: 'border border-[#dfd5c4] text-[#2d251e] bg-white',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
