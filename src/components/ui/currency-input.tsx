'use client';

import * as React from 'react';
import { maskCurrencyFromDigits, formatCurrencyFloat } from '@/lib/masks';
import { cn } from '@/lib/utils';

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    // Mantém a string de dígitos em centavos
    const [displayStr, setDisplayStr] = React.useState(() => {
      return value > 0 ? formatCurrencyFloat(value) : 'R$ 0,00';
    });

    // Sincroniza se o valor externo mudar (ex: reset do formulário)
    React.useEffect(() => {
      setDisplayStr(formatCurrencyFloat(value || 0));
    }, [value]);

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      const digits = raw.replace(/\D/g, '');
      const { display, numericValue } = maskCurrencyFromDigits(digits);
      setDisplayStr(display);
      onChange(numericValue);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      // Permite teclas de navegação comuns
      if (
        ['Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(
          e.key
        )
      ) {
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const currentDigits = displayStr.replace(/\D/g, '');
        const newDigits = currentDigits.slice(0, -1);
        const { display, numericValue } = maskCurrencyFromDigits(newDigits);
        setDisplayStr(display);
        onChange(numericValue);
        return;
      }

      // Se for um dígito numérico (0 a 9)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        const currentDigits = displayStr.replace(/\D/g, '');
        // Limita a valores razoáveis (até 999.999,99)
        if (currentDigits.length >= 9) return;

        const newDigits = currentDigits + e.key;
        const { display, numericValue } = maskCurrencyFromDigits(newDigits);
        setDisplayStr(display);
        onChange(numericValue);
      }
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      const digits = pasted.replace(/\D/g, '');
      if (digits) {
        const { display, numericValue } = maskCurrencyFromDigits(digits);
        setDisplayStr(display);
        onChange(numericValue);
      }
    }

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayStr}
          onKeyDown={handleKeyDown}
          onChange={handleInputChange}
          onPaste={handlePaste}
          className={cn(
            'flex h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm sm:text-base font-bold text-[#0f172a] placeholder:text-slate-400 transition-all focus:border-[#0369a1] focus:outline-none focus:ring-2 focus:ring-[#0369a1]/20 shadow-2xs min-h-[44px]',
            className
          )}
          {...props}
        />
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider text-slate-400 pointer-events-none">
          BRL
        </span>
      </div>
    );
  }
);
CurrencyInput.displayName = 'CurrencyInput';

