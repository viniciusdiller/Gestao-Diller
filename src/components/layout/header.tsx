'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function Header() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-[#f0e9df]/90 backdrop-blur-md border-b border-[#dfd5c4]/80 px-4 py-3 pt-safe transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#977f5a]/40 shadow-[0_2px_8px_rgba(151,127,90,0.18)] bg-white shrink-0 p-0.5">
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
              <h1 className="text-[17px] font-bold tracking-tight text-[#28211b] leading-tight">
                Renata Diller
              </h1>
            </div>
            <p className="text-[10px] font-bold tracking-[0.22em] text-[#977f5a] uppercase">
              Semijoias Finas
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="h-10 w-10 flex items-center justify-center rounded-2xl text-[#87786b] hover:text-[#b91c1c] hover:bg-black/5 active:scale-95 transition-all border border-transparent hover:border-[#dfd5c4]"
          title="Sair do sistema"
          aria-label="Sair da conta"
        >
          <LogOut className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>
    </header>
  );
}
