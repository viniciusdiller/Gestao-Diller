'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
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
    <header className="sticky top-0 z-30 bg-[#f0e9df]/95 backdrop-blur-md border-b border-[#dfd5c4] px-4 py-2.5 pt-safe">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#977f5a]/30 shadow-xs bg-white shrink-0">
            <Image
              src="/logo.jpg"
              alt="Renata Diller Semijoias"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-[#2d251e] leading-tight">
              Renata Diller
            </h1>
            <p className="text-[11px] font-medium tracking-widest text-[#977f5a] uppercase">
              Semijoias
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="h-10 w-10 flex items-center justify-center rounded-xl text-[#766a5e] hover:text-[#b91c1c] hover:bg-black/5 active:bg-black/10 transition-colors"
          title="Sair do sistema"
          aria-label="Sair da conta"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
