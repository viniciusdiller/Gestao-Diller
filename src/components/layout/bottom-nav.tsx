'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  ReceiptText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
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

  return (
    <nav className="fixed bottom-2 left-3 right-3 z-40 max-w-md mx-auto">
      <div className="rounded-3xl bg-[#fdfbf8]/95 backdrop-blur-xl border border-[#dfd5c4] px-2 py-1.5 shadow-[0_10px_30px_rgba(45,35,25,0.10)] grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'relative flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-200 active:scale-95 min-h-[50px] select-none',
                item.active
                  ? 'text-[#977f5a] font-bold'
                  : 'text-[#87786b] hover:text-[#28211b]'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-xl transition-all duration-200',
                  item.active
                    ? 'bg-[#977f5a]/15 text-[#977f5a] scale-105 shadow-xs'
                    : 'text-current hover:bg-black/5'
                )}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
              {item.active && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#977f5a] shadow-[0_0_6px_#977f5a]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
