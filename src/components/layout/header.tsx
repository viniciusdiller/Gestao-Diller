'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  Sparkles,
  LayoutDashboard,
  ShoppingBag,
  Users,
  ReceiptText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

export function Header() {
  const router = useRouter();
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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-[#f0e9df]/95 backdrop-blur-md border-b border-[#dfd5c4]/80 px-4 sm:px-6 lg:px-8 py-3 pt-safe transition-all">
      <div className="max-w-5xl lg:max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 group cursor-pointer select-none">
          <div className="relative">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#977f5a]/40 shadow-[0_2px_8px_rgba(151,127,90,0.18)] bg-white shrink-0 p-0.5 group-hover:border-[#977f5a] transition-all duration-200">
              <Image
                src="/logo.jpg"
                alt="Renata Diller Semijoias"
                width={44}
                height={44}
                className="w-full h-full object-cover rounded-full"
                priority
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#977f5a] flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-[17px] font-bold tracking-tight text-[#28211b] leading-tight group-hover:text-[#977f5a] transition-colors">
                Renata Diller
              </h1>
            </div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#977f5a] uppercase">
              Semijoias Finas
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Tabs (Apenas telas médias e grandes) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#ffffff]/80 backdrop-blur-md p-1.5 rounded-2xl border border-[#dfd5c4] shadow-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none',
                  item.active
                    ? 'bg-[#977f5a] text-white shadow-xs scale-[1.02]'
                    : 'text-[#6b5e52] hover:text-[#28211b] hover:bg-black/5 active:scale-95'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Botão de Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className="h-10 px-3.5 flex items-center gap-1.5 rounded-2xl text-[#87786b] hover:text-[#b91c1c] hover:bg-black/5 active:scale-95 transition-all border border-transparent hover:border-[#dfd5c4] cursor-pointer"
            title="Sair do sistema"
            aria-label="Sair da conta"
          >
            <LogOut className="w-4 h-4 stroke-[2.2]" />
            <span className="hidden sm:inline text-xs font-semibold">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
