import * as React from 'react';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { createClient } from '@/lib/supabase/server';

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

  return (
    <div className="min-h-screen flex flex-col bg-[#f0e9df] text-[#2d251e]">
      <Header />
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 pb-28">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
