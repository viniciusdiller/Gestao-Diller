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
        'p-3 bg-white rounded-2xl border border-[#e4dcd0] shadow-sm inline-block select-none',
        className
      )}
      style={
        {
          '--rdp-accent-color': '#977f5a',
          '--rdp-accent-background-color': '#f5efe6',
          '--rdp-day-height': '40px',
          '--rdp-day-width': '40px',
          '--rdp-day_button-border-radius': '10px',
          '--rdp-day_button-height': '38px',
          '--rdp-day_button-width': '38px',
          '--rdp-today-color': '#977f5a',
          '--rdp-selected-border': '2px solid #977f5a',
        } as React.CSSProperties
      }
    >
      <DayPicker
        showOutsideDays={showOutsideDays}
        locale={locale}
        classNames={{
          root: cn(defaultClassNames.root, 'text-[#2d251e]'),
          month_caption: cn(
            defaultClassNames.month_caption,
            'flex justify-center items-center h-10 font-bold text-sm text-[#2d251e] capitalize'
          ),
          caption_label: 'text-sm font-bold text-[#2d251e] capitalize',
          nav: cn(defaultClassNames.nav, 'flex items-center justify-between w-full absolute inset-x-0 px-2'),
          button_previous: cn(
            defaultClassNames.button_previous,
            'h-8 w-8 rounded-lg border border-[#ebdcca] hover:bg-[#f5efe6] text-[#766a5e] hover:text-[#2d251e] transition-colors flex items-center justify-center'
          ),
          button_next: cn(
            defaultClassNames.button_next,
            'h-8 w-8 rounded-lg border border-[#ebdcca] hover:bg-[#f5efe6] text-[#766a5e] hover:text-[#2d251e] transition-colors flex items-center justify-center'
          ),
          weekday: 'text-[11px] font-semibold text-[#766a5e] uppercase tracking-wider py-1.5',
          day_button: cn(
            defaultClassNames.day_button,
            'text-xs font-semibold hover:bg-[#f5efe6] transition-all cursor-pointer'
          ),
          selected: cn(
            defaultClassNames.selected,
            'bg-[#977f5a] text-white font-bold rounded-xl shadow-xs'
          ),
          today: 'font-bold text-[#977f5a] underline decoration-[#977f5a] decoration-2 underline-offset-4',
          outside: 'text-neutral-300 opacity-60',
          disabled: 'text-neutral-300 opacity-40 cursor-not-allowed',
          ...classNames,
        }}
        {...props}
      />
    </div>
  );
}

Calendar.displayName = 'Calendar';
