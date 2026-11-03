import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  message?: string;
  className?: string;
  variant?: 'spinner' | 'cards';
  count?: number;
}

export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-7 h-7 border-[2.5px]',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <div
        className={cn(
          'rounded-full border-[#dfd5c4] border-t-[#977f5a] animate-spin',
          sizeClasses[size]
        )}
      />
    </div>
  );
}

export function LoadingState({
  message = 'Carregando...',
  className,
  variant = 'spinner',
  count = 3,
}: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4',
          className
        )}
      >
        {Array.from({ length: count }).map((_, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-white/80 border border-[#e4dcd0] shadow-xs animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 bg-[#ebdcca]/70 rounded-md w-2/3" />
              <div className="h-4 bg-[#ebdcca]/50 rounded-md w-1/4" />
            </div>
            <div className="h-3 bg-[#ebdcca]/40 rounded-md w-1/2" />
            <div className="pt-2 border-t border-[#ebdcca]/40 flex justify-between">
              <div className="h-3 bg-[#ebdcca]/40 rounded-md w-1/3" />
              <div className="h-3 bg-[#ebdcca]/40 rounded-md w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('py-12 flex flex-col items-center justify-center gap-3', className)}>
      <div className="relative flex items-center justify-center">
        <div className="w-9 h-9 rounded-full border-2 border-[#dfd5c4] border-t-[#977f5a] animate-spin" />
        <div className="absolute w-6 h-6 rounded-full bg-[#977f5a]/10 animate-pulse" />
      </div>
      <p className="text-xs font-medium text-[#766a5e] tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
}

