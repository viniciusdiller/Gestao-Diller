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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#fbf8f4]/95 backdrop-blur-md border-t border-[#dfd5c4] px-2 py-1.5 pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
      <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 active:scale-95 min-h-[48px]',
                item.active
                  ? 'text-[#977f5a] font-semibold'
                  : 'text-[#8b7d6e] hover:text-[#2d251e]'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-lg transition-colors',
                  item.active ? 'bg-[#977f5a]/15 text-[#977f5a]' : 'text-current'
                )}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
