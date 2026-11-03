'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
  className?: string;
  initialMonth?: Date;
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function Calendar({
  selected,
  onSelect,
  className,
  initialMonth,
}: CalendarProps) {
  const [viewDate, setViewDate] = React.useState<Date>(() => {
    if (selected instanceof Date && !isNaN(selected.getTime())) {
      return new Date(selected.getFullYear(), selected.getMonth(), 1);
    }
    if (initialMonth instanceof Date && !isNaN(initialMonth.getTime())) {
      return new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1);
    }
    return new Date();
  });

  // Atualiza mês visualizado se a seleção externa mudar
  React.useEffect(() => {
    if (selected instanceof Date && !isNaN(selected.getTime())) {
      setViewDate(new Date(selected.getFullYear(), selected.getMonth(), 1));
    }
  }, [selected]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  function handlePrevMonth(e: React.MouseEvent) {
    e.stopPropagation();
    setViewDate(new Date(year, month - 1, 1));
  }

  function handleNextMonth(e: React.MouseEvent) {
    e.stopPropagation();
    setViewDate(new Date(year, month + 1, 1));
  }

  // Cálculos do grid mensal
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Dias do mês anterior para completar o início da 1ª semana
  const prevDays = React.useMemo(() => {
    return Array.from(
      { length: firstDayOfWeek },
      (_, i) => daysInPrevMonth - firstDayOfWeek + 1 + i
    );
  }, [firstDayOfWeek, daysInPrevMonth]);

  // Dias do mês atual
  const currentDays = React.useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Dias do próximo mês para fechar a última semana
  const nextDays = React.useMemo(() => {
    const total = firstDayOfWeek + daysInMonth;
    const remainder = (7 - (total % 7)) % 7;
    return Array.from({ length: remainder }, (_, i) => i + 1);
  }, [firstDayOfWeek, daysInMonth]);

  const today = new Date();
  const isCurrentMonthToday =
    today.getFullYear() === year && today.getMonth() === month;

  function isDaySelected(dayNum: number): boolean {
    if (!selected || isNaN(selected.getTime())) return false;
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === dayNum
    );
  }

  function handleSelectDay(dayNum: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!onSelect) return;
    const target = new Date(year, month, dayNum);
    onSelect(target);
  }

  return (
    <div
      className={cn(
        'w-full select-none bg-white font-sans text-[#0f172a]',
        className
      )}
    >
      {/* Header do Mês e Navegação */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs sm:text-sm font-bold capitalize text-[#0f172a]">
          {MONTH_NAMES[month]} {year}
        </span>

        <button
          type="button"
          onClick={handleNextMonth}
          className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          title="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dias da Semana (DOM a SÁB) */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES.map((name, idx) => (
          <span
            key={name}
            className={cn(
              'text-[10px] sm:text-[11px] font-bold uppercase tracking-wider py-1',
              idx === 0
                ? 'text-rose-500'
                : idx === 6
                ? 'text-sky-600'
                : 'text-slate-400'
            )}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Grade de Dias */}
      <div className="grid grid-cols-7 gap-1">
        {/* Dias Mês Anterior */}
        {prevDays.map((d) => (
          <div
            key={`prev-${d}`}
            className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-slate-300 select-none opacity-40 cursor-default"
          >
            {d}
          </div>
        ))}

        {/* Dias Mês Atual */}
        {currentDays.map((d) => {
          const selected = isDaySelected(d);
          const isToday = isCurrentMonthToday && today.getDate() === d;

          return (
            <button
              key={`curr-${d}`}
              type="button"
              onClick={(e) => handleSelectDay(d, e)}
              className={cn(
                'h-8 w-8 mx-auto rounded-xl flex items-center justify-center text-xs font-semibold transition-all cursor-pointer',
                selected
                  ? 'bg-[#0369a1] text-white font-bold shadow-xs hover:bg-[#0284c7]'
                  : isToday
                  ? 'text-[#0369a1] font-bold border border-[#0369a1]/40 bg-[#0369a1]/10 hover:bg-[#0369a1]/20'
                  : 'text-[#0f172a] hover:bg-slate-100 hover:text-slate-900 active:scale-95'
              )}
            >
              {d}
            </button>
          );
        })}

        {/* Dias Próximo Mês */}
        {nextDays.map((d) => (
          <div
            key={`next-${d}`}
            className="h-8 w-8 mx-auto flex items-center justify-center text-xs text-slate-300 select-none opacity-40 cursor-default"
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}
