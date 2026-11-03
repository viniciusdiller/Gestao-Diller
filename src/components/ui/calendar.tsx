'use client';

import * as React from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = ptBR,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <div
      className={cn(
        'p-1 bg-white select-none w-full flex justify-center',
        className
      )}
      style={
        {
          '--rdp-accent-color': '#0369a1',
          '--rdp-accent-background-color': '#e0f2fe',
          '--rdp-day-height': '36px',
          '--rdp-day-width': '36px',
          '--rdp-day_button-border-radius': '10px',
          '--rdp-day_button-height': '34px',
          '--rdp-day_button-width': '34px',
          '--rdp-today-color': '#0369a1',
          '--rdp-selected-border': '2px solid #0369a1',
        } as React.CSSProperties
      }
    >
      <DayPicker
        showOutsideDays={showOutsideDays}
        locale={locale}
        classNames={{
          root: cn(defaultClassNames.root, 'text-[#0f172a] w-full'),
          month: 'space-y-2 relative',
          month_caption: 'relative flex justify-center items-center h-9 font-bold text-sm text-[#0f172a] capitalize px-10',
          caption_label: 'text-sm font-bold text-[#0f172a] capitalize',
          nav: 'absolute top-0 inset-x-0 h-9 flex items-center justify-between px-1 z-10 pointer-events-none',
          button_previous: cn(
            defaultClassNames.button_previous,
            'h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors flex items-center justify-center pointer-events-auto cursor-pointer'
          ),
          button_next: cn(
            defaultClassNames.button_next,
            'h-7 w-7 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors flex items-center justify-center pointer-events-auto cursor-pointer'
          ),
          weekdays: 'grid grid-cols-7 text-center mb-1',
          weekday: 'text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-1',
          weeks: 'space-y-1',
          week: 'grid grid-cols-7 gap-1',
          day: 'flex items-center justify-center',
          day_button: cn(
            defaultClassNames.day_button,
            'text-xs font-semibold hover:bg-slate-100 transition-all cursor-pointer rounded-xl h-8 w-8 flex items-center justify-center'
          ),
          selected: cn(
            defaultClassNames.selected,
            'bg-[#0369a1] text-white font-bold rounded-xl shadow-xs hover:bg-[#0284c7]'
          ),
          today: 'font-bold text-[#0369a1] underline decoration-[#0369a1] decoration-2 underline-offset-4',
          outside: 'text-slate-300 opacity-50',
          disabled: 'text-slate-300 opacity-40 cursor-not-allowed',
          ...classNames,
        }}
        {...props}
      />
    </div>
  );
}

Calendar.displayName = 'Calendar';
