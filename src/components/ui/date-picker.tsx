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
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Selecione uma data...',
  disabled = false,
  className,
  required = false,
  showPresets = true,
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
          'flex h-12 w-full items-center justify-between rounded-xl border border-[#dfd5c4] bg-white px-3.5 py-2 text-sm text-[#2d251e] transition-all cursor-pointer shadow-xs',
          isOpen && 'border-[#977f5a] ring-2 ring-[#977f5a]/20',
          disabled && 'opacity-50 cursor-not-allowed bg-neutral-100'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-1">
          <CalendarIcon className="w-4 h-4 text-[#977f5a] shrink-0" />
          <span
            className={cn(
              'truncate font-medium capitalize',
              !selectedDate && 'text-neutral-400 font-normal'
            )}
          >
            {selectedDate ? displayText : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 text-[#766a5e]">
          {selectedDate && !required && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-[#2d251e] rounded-full hover:bg-neutral-100"
              title="Limpar data"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Popover / Dropdown do Calendário ShadCN */}
      {isOpen && (
        <div className="absolute left-0 right-0 sm:left-auto sm:right-auto top-[calc(100%+6px)] z-50 rounded-2xl border border-[#dfd5c4] bg-white p-2.5 shadow-[0_14px_36px_rgba(45,35,25,0.14)] animate-dropdown origin-top">
          {/* Botões de Atalho Rápido para Vendas e Fiado */}
          {showPresets && (
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#ebdcca]/80 overflow-x-auto text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => handleApplyOffset(0)}
                className="px-2.5 py-1 rounded-lg bg-[#faf6f0] border border-[#ebdcca] text-[#766a5e] hover:text-[#2d251e] hover:bg-[#f5efe6] font-medium transition-colors shrink-0"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => handleApplyOffset(1)}
                className="px-2.5 py-1 rounded-lg bg-[#faf6f0] border border-[#ebdcca] text-[#766a5e] hover:text-[#2d251e] hover:bg-[#f5efe6] font-medium transition-colors shrink-0"
              >
                Amanhã
              </button>
              <button
                type="button"
                onClick={() => handleApplyOffset(15)}
                className="px-2.5 py-1 rounded-lg bg-[#faf6f0] border border-[#ebdcca] text-[#766a5e] hover:text-[#2d251e] hover:bg-[#f5efe6] font-medium transition-colors shrink-0"
              >
                +15 dias
              </button>
              <button
                type="button"
                onClick={() => handleApplyOffset(30)}
                className="px-2.5 py-1 rounded-lg bg-[#977f5a]/15 text-[#836d4b] border border-[#977f5a]/30 font-semibold hover:bg-[#977f5a]/25 transition-colors shrink-0"
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
