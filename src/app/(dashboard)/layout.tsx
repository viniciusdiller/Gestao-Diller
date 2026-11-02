import * as React from 'react';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
