'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  ReceiptText,
  CalendarDays,
  KeyRound,
} from 'lucide-react';
import { useWorkspace } from '@/contexts/workspace-context';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const { isCasaItauna } = useWorkspace();

  const semijoiasNavItems = [
    {
      label: 'Início',
      href: '/',
      icon: LayoutDashboard,
      active: pathname === '/',
    },
    {
      label: 'Vendas',
      href: '/vendas',
      icon: ShoppingBag,
      active: pathname.startsWith('/vendas'),
    },
    {
      label: 'Clientes',
      href: '/clientes',
      icon: Users,
      active: pathname.startsWith('/clientes'),
    },
    {
      label: 'Cobranças',
      href: '/cobrancas',
      icon: ReceiptText,
      active: pathname.startsWith('/cobrancas'),
    },
  ];

  const casaItaunaNavItems = [
    {
      label: 'Início',
      href: '/itauna',
      icon: LayoutDashboard,
      active: pathname === '/itauna',
    },
    {
      label: 'Calendário',
      href: '/itauna/calendario',
      icon: CalendarDays,
      active: pathname.startsWith('/itauna/calendario'),
    },
    {
      label: 'Reservas',
      href: '/itauna/reservas',
      icon: KeyRound,
      active: pathname.startsWith('/itauna/reservas'),
    },
    {
      label: 'Hóspedes',
      href: '/itauna/hospedes',
      icon: Users,
      active: pathname.startsWith('/itauna/hospedes'),
    },
    {
      label: 'Despesas',
      href: '/itauna/despesas',
      icon: ReceiptText,
      active: pathname.startsWith('/itauna/despesas'),
    },
  ];

  const activeNavItems = isCasaItauna ? casaItaunaNavItems : semijoiasNavItems;
  const gridColsClass = isCasaItauna ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <nav className="fixed bottom-2 left-3 right-3 z-40 max-w-md mx-auto md:hidden">
      <div
        className={cn(
          'rounded-3xl backdrop-blur-xl px-1.5 py-1.5 grid gap-1 transition-all duration-300',
          isCasaItauna
            ? 'bg-white/95 border border-[#e2e8f0] shadow-[0_10px_30px_rgba(3,105,161,0.10)]'
            : 'bg-white/95 border border-[#e3dacd] shadow-[0_10px_30px_rgba(45,35,25,0.08)]',
          gridColsClass
        )}
      >
        {activeNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 px-0.5 rounded-2xl transition-all duration-150 active:scale-90 min-h-[50px] select-none cursor-pointer',
                item.active
                  ? isCasaItauna
                    ? 'text-[#0369a1] font-bold'
                    : 'text-[#977f5a] font-bold'
                  : isCasaItauna
                  ? 'text-slate-500 hover:text-slate-900'
                  : 'text-[#766a5e] hover:text-[#2d251e]'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-150',
                  item.active
                    ? isCasaItauna
                      ? 'bg-[#e0f2fe] text-[#0369a1] scale-105 shadow-xs animate-pop'
                      : 'bg-[#977f5a]/15 text-[#977f5a] scale-105 shadow-xs animate-pop'
                    : 'text-current hover:bg-black/5 active:scale-95'
                )}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium truncate max-w-full">
                {item.label}
              </span>
              {item.active && (
                <span
                  className={cn(
                    'absolute bottom-1 w-1.5 h-1.5 rounded-full animate-pop',
                    isCasaItauna
                      ? 'bg-[#0369a1] shadow-[0_0_6px_#0369a1]'
                      : 'bg-[#977f5a] shadow-[0_0_6px_#977f5a]'
                  )}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
