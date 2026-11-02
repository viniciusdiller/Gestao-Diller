import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

    const variants = {
      primary:
        'bg-[#977f5a] text-white hover:bg-[#836d4b] active:bg-[#725e3f] shadow-sm',
      secondary:
        'bg-[#e6decb] text-[#2d251e] hover:bg-[#ded4bf] active:bg-[#d4c8b0]',
      outline:
        'border border-[#977f5a] text-[#977f5a] bg-transparent hover:bg-[#977f5a]/10',
      ghost:
        'text-[#2d251e] hover:bg-black/5 active:bg-black/10',
      danger:
        'bg-[#b91c1c] text-white hover:bg-[#991b1b] active:bg-[#7f1d1d]',
      success:
        'bg-[#15803d] text-white hover:bg-[#166534] active:bg-[#14532d]',
    };

    const sizes = {
      sm: 'h-9 px-3 text-sm min-h-[36px]',
      md: 'h-11 px-4 text-base min-h-[44px]',
      lg: 'h-13 px-6 text-base font-semibold min-h-[52px]',
      icon: 'h-11 w-11 min-h-[44px] min-w-[44px]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>Carregando...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
