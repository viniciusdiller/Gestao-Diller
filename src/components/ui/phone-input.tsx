'use client';

import * as React from 'react';
import { maskPhone } from '@/lib/masks';
import { cn } from '@/lib/utils';

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, placeholder = '(21) 98765-4321', ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      const masked = maskPhone(raw);
      onChange(masked);
    }

    return (
      <input
        ref={ref}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={cn(
          'flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm sm:text-base text-[#0f172a] placeholder:text-slate-400 transition-all focus:border-[#0369a1] focus:outline-none focus:ring-2 focus:ring-[#0369a1]/20 shadow-2xs min-h-[44px]',
          className
        )}
        {...props}
      />
    );
  }
);
PhoneInput.displayName = 'PhoneInput';
