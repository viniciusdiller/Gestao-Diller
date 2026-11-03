'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './calendar';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  value?: string; // Formato YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  showPresets?: boolean;
  align?: 'left' | 'right';
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data...',
  disabled = false,
  className,
  required = false,
  showPresets = true,
  align = 'left',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Converte string YYYY-MM-DD para Date local sem bug de fuso horário UTC
  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parts = value.slice(0, 10).split('-');
    if (parts.length !== 3) return undefined;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return undefined;
    return new Date(y, m - 1, d);
  }, [value]);

  // Formata a data selecionada para exibição em português
  const displayText = React.useMemo(() => {
    if (!selectedDate) return '';
    return format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  }, [selectedDate]);

  // Fecha ao clicar fora
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(day: Date | undefined) {
    if (!day) return;
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  }

  function handleApplyOffset(daysOffset: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    handleSelect(d);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Botão Touch Trigger */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen((prev) => !prev);
          }
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-[#0f172a] transition-all cursor-pointer shadow-2xs hover:border-[#0369a1]/40',
          isOpen && 'border-[#0369a1] ring-2 ring-[#0369a1]/20',
          disabled && 'opacity-50 cursor-not-allowed bg-slate-100'
        )}
      >
        <div className="flex items-center gap-2 min-w-0 pr-1">
          <CalendarIcon className="w-4 h-4 text-[#0369a1] shrink-0" />
          <span
            className={cn(
              'truncate font-medium capitalize',
              !selectedDate && 'text-slate-400 font-normal'
            )}
          >
            {selectedDate ? displayText : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-500">
          {selectedDate && !required && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-[#0f172a] rounded-full hover:bg-slate-100 cursor-pointer"
              title="Limpar data"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Popover / Dropdown do Calendário ShadCN */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-[calc(100%+6px)] z-[80] w-[310px] sm:w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.18)] animate-dropdown origin-top',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {/* Botões de Atalho Rápido para Vendas e Reservas */}
          {showPresets && (
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-100 overflow-x-auto text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => handleApplyOffset(0)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors shrink-0 cursor-pointer"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handleApplyOffset(1)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors shrink-0 cursor-pointer"
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => handleApplyOffset(15)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors shrink-0 cursor-pointer"
              >
                +15 dias
              </button>
              <button
                type="button"
                onClick={() => handleApplyOffset(30)}
                className="px-2.5 py-1 rounded-lg bg-[#0369a1]/10 text-[#0369a1] border border-[#0369a1]/20 font-semibold hover:bg-[#0369a1]/20 transition-colors shrink-0 cursor-pointer"
              >
                +30 dias
              </button>
            </div>
          )}

          {/* Calendário ShadCN UI com react-day-picker */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            className="w-full border-none shadow-none p-0"
          />
        </div>
      )}
    </div>
  );
}
