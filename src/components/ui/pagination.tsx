'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemName?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = 6,
  itemName = 'itens',
  className,
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  // Gera lista de páginas para exibição
  const pages = React.useMemo(() => {
    const items: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      if (currentPage > 3) items.push('ellipsis');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!items.includes(i)) items.push(i);
      }

      if (currentPage < totalPages - 2) items.push('ellipsis');
      if (!items.includes(totalPages)) items.push(totalPages);
    }

    return items;
  }, [currentPage, totalPages]);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 border-t border-[#ebdcca]/80 text-xs text-[#766a5e]',
        className
      )}
    >
      {/* Indicador de Quantidade */}
      <div>
        {totalItems !== undefined ? (
          <span>
            Mostrando{' '}
            <strong className="font-semibold text-[#2d251e]">
              {Math.min((currentPage - 1) * (pageSize || 6) + 1, totalItems)}
            </strong>{' '}
            a{' '}
            <strong className="font-semibold text-[#2d251e]">
              {Math.min(currentPage * (pageSize || 6), totalItems)}
            </strong>{' '}
            de <strong className="font-semibold text-[#2d251e]">{totalItems}</strong> {itemName}
          </span>
        ) : (
          <span>
            Página <strong className="font-semibold text-[#2d251e]">{currentPage}</strong> de{' '}
            <strong className="font-semibold text-[#2d251e]">{totalPages}</strong>
          </span>
        )}
      </div>

      {/* Controles de Navegação */}
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-9 px-2.5 gap-1 border-[#dfd5c4] text-[#2d251e] disabled:opacity-40"
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-neutral-400">
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold transition-all cursor-pointer select-none',
                  isActive
                    ? 'bg-[#977f5a] text-white shadow-xs font-bold scale-105'
                    : 'bg-white text-[#766a5e] hover:text-[#2d251e] hover:bg-[#faf6f0] border border-[#dfd5c4]'
                )}
              >
                {p}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-9 px-2.5 gap-1 border-[#dfd5c4] text-[#2d251e] disabled:opacity-40"
          title="Próxima página"
        >
          <span className="hidden sm:inline">Próxima</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

