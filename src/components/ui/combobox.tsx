'use client';

import * as React from 'react';
import { Search, Check, ChevronDown, X, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string | null;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  onAddNew?: (query: string) => void;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecione uma opção...',
  searchPlaceholder = 'Digite para buscar...',
  emptyText = 'Nenhuma opção encontrada.',
  className,
  disabled = false,
  onAddNew,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filtra opções de acordo com a digitação do usuário
  const filteredOptions = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, query]);

  // Fecha ao clicar fora
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(val: string) {
    onChange(val);
    setIsOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Botão de disparo / visualização mobile touch */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen((prev) => !prev);
          }
        }}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-xl border border-[#dfd5c4] bg-white px-3.5 py-2 text-sm text-[#2d251e] transition-all cursor-pointer shadow-xs',
          isOpen && 'border-[#977f5a] ring-2 ring-[#977f5a]/20',
          disabled && 'opacity-50 cursor-not-allowed bg-neutral-100'
        )}
      >
        <span className={cn('truncate font-medium', !selectedOption && 'text-neutral-400')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div className="flex items-center gap-1 shrink-0 text-[#766a5e]">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-[#2d251e] rounded-full hover:bg-neutral-100"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </div>

      {/* Dropdown Flutuante Mobile-Friendly */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-[#dfd5c4] bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Input de Busca Digitável em Tempo Real */}
          <div className="p-2 border-b border-[#ebdcca]/80 bg-[#fbf9f6] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#977f5a] shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-[#2d251e] placeholder-neutral-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-neutral-400 hover:text-neutral-600 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista de Opções Rolável (Touch amigável) */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-[#766a5e]">{emptyText}</p>
                {onAddNew && query.trim().length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew(query.trim());
                      setIsOpen(false);
                      setQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#977f5a] hover:underline"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Cadastrar &quot;{query.trim()}&quot; agora
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm transition-all active:scale-[0.99]',
                      isSelected
                        ? 'bg-[#977f5a] text-white font-semibold'
                        : 'text-[#2d251e] hover:bg-[#f5efe6]'
                    )}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="truncate text-sm">{opt.label}</p>
                      {opt.sublabel && (
                        <p
                          className={cn(
                            'text-xs truncate',
                            isSelected ? 'text-white/80' : 'text-[#766a5e]'
                          )}
                        >
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
