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
          'rounded-3xl bg-[var(--surface)]/95 backdrop-blur-xl border border-[var(--border)] px-1.5 py-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] grid gap-1 transition-all duration-300',
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
                  ? 'text-[var(--primary)] font-bold'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-150',
                  item.active
                    ? 'bg-[var(--primary)]/15 text-[var(--primary)] scale-105 shadow-xs animate-pop'
                    : 'text-current hover:bg-black/5 active:scale-95'
                )}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium truncate max-w-full">
                {item.label}
              </span>
              {item.active && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary)] animate-pop" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
