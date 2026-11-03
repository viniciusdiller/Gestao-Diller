'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
}: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#fcfaf7] rounded-t-3xl sm:rounded-2xl border border-[#e3dacd] p-5 shadow-2xl max-h-[90vh] overflow-y-auto animate-drawer sm:animate-pop"
        role="dialog"
        aria-modal="true"
      >
        {/* Barra tátil superior para indicar bottom-sheet no mobile */}
        <div className="w-10 h-1 bg-[#d8c8b0] rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-[#ebdcca]">
          <div>
            <h2 className="text-lg font-bold text-[#2d251e] leading-snug">{title}</h2>
            {description && (
              <p className="text-xs text-[#766a5e] mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full flex items-center justify-center text-[#766a5e] hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>
  );
}
