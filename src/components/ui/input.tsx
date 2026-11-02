import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-xl border border-[#dfd5c4] bg-white px-3.5 py-2 text-base text-[#2d251e] placeholder:text-[#a09485] transition-colors focus:border-[#977f5a] focus:outline-none focus:ring-2 focus:ring-[#977f5a]/20 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-xl border border-[#dfd5c4] bg-white px-3.5 py-2.5 text-base text-[#2d251e] placeholder:text-[#a09485] transition-colors focus:border-[#977f5a] focus:outline-none focus:ring-2 focus:ring-[#977f5a]/20 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
