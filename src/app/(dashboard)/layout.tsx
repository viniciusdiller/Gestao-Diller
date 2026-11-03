import * as React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { createClient } from '@/lib/supabase/server';
import { WorkspaceProvider, WorkspaceType } from '@/contexts/workspace-context';
import { WorkspaceSwitcherModal } from '@/components/layout/workspace-switcher-modal';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const initialWorkspace =
    (cookieStore.get('gestao_workspace')?.value as WorkspaceType) || 'semijoias';

  return (
    <WorkspaceProvider initialWorkspace={initialWorkspace}>
      <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
        <Header />
        <main className="flex-1 w-full max-w-5xl lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-12 transition-all">
          {children}
        </main>
        <BottomNav />
        <WorkspaceSwitcherModal />
      </div>
    </WorkspaceProvider>
  );
}
