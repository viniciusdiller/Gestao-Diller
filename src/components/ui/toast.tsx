'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const showToast = React.useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToast({ id: Date.now(), message, type });
      timerRef.current = setTimeout(() => {
        setToast(null);
      }, 3500);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed top-3 left-4 right-4 z-50 max-w-sm mx-auto flex items-center justify-between p-3.5 rounded-2xl bg-[#28211b]/95 backdrop-blur-md text-white shadow-2xl border border-[#977f5a]/30 animate-in fade-in slide-in-from-top-3 duration-250">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {toast.type === 'success' ? (
              <div className="p-1 rounded-full bg-[#15803d]/30 text-[#4ade80] shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            ) : toast.type === 'error' ? (
              <div className="p-1 rounded-full bg-red-500/30 text-red-400 shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            ) : (
              <div className="p-1 rounded-full bg-[#977f5a]/30 text-[#e6decb] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
            )}
            <p className="text-xs font-medium text-white truncate leading-snug">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-white/60 hover:text-white p-1 rounded-lg shrink-0"
            aria-label="Fechar notificação"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
    };
  }
  return context;
}

