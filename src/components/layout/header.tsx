'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LogOut,
  LayoutDashboard,
  ShoppingBag,
  Users,
  ReceiptText,
  CalendarDays,
  KeyRound,
  Waves,
  Gem,
  ArrowLeftRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useWorkspace } from '@/contexts/workspace-context';
import { cn } from '@/lib/utils';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { workspace, isCasaItauna, setIsModalOpen } = useWorkspace();

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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-b border-[var(--border)]/80 px-4 sm:px-6 lg:px-8 py-3 pt-safe transition-all duration-300">
      <div className="max-w-5xl lg:max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Brand / Logo com Disparo para Trocar Gestão */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 group cursor-pointer select-none"
          title="Clique para alternar entre Semijoias e Casa Itaúna"
        >
          <div className="relative">
            {isCasaItauna ? (
              <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-[#0369a1] shadow-2xs bg-white shrink-0 p-0.5 transition-all duration-300 animate-pop">
                <Image
                  src="/logo-itauna.jpg"
                  alt="Casa Itaúna - Saquarema"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover rounded-xl"
                  priority
                />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-[#e2e8f0] shadow-2xs bg-white shrink-0 p-0.5 group-hover:border-[#977f5a] transition-all duration-300 animate-pop">
                <Image
                  src="/diller.jpg"
                  alt="Diller-Hub"
                  width={44}
                  height={44}
                  className="w-full h-full object-cover rounded-xl"
                  priority
                />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-[17px] font-black tracking-tight text-[var(--foreground)] leading-tight group-hover:text-[var(--primary)] transition-colors">
                Diller-Hub
              </h1>
            </div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[var(--primary)] uppercase flex items-center gap-1">
              {isCasaItauna ? 'Casa Itaúna — Saquarema' : 'Renata Diller — Semijoias'}
            </p>
          </div>
        </div>

        {/* Desktop Navigation Tabs (Telas médias e grandes) */}
        <nav className="hidden md:flex items-center gap-1 bg-[var(--surface)]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[var(--border)] shadow-xs transition-all">
          {activeNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none',
                  item.active
                    ? 'bg-[var(--primary)] text-white shadow-xs scale-[1.02]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-black/5 active:scale-95'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Ações: Botão Trocar Gestão e Logout */}
        <div className="flex items-center gap-2">
          {/* Botão Trocar Gestão */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-10 px-3 flex items-center gap-1.5 rounded-2xl bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)] shadow-xs touch-pill active:scale-95 transition-all cursor-pointer"
            title="Alternar entre Semijoias e Casa Itaúna"
            aria-label="Alternar Gestão"
          >
            {isCasaItauna ? (
              <Waves className="w-4 h-4 text-[#0369a1]" />
            ) : (
              <Gem className="w-4 h-4 text-[#977f5a]" />
            )}
            <span className="hidden sm:inline text-xs font-bold">
              {isCasaItauna ? 'Casa Itaúna' : 'Semijoias'}
            </span>
            <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--muted-foreground)] ml-0.5" />
          </button>

          {/* Botão de Logout */}
          <button
            onClick={handleLogout}
            className="h-10 px-3 flex items-center gap-1.5 rounded-2xl text-[var(--muted-foreground)] hover:text-[#b91c1c] hover:bg-black/5 active:scale-95 transition-all border border-transparent hover:border-[var(--border)] cursor-pointer"
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
