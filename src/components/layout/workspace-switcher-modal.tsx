'use client';

import * as React from 'react';
import Image from 'next/image';
import { Check, Gem, Home, ArrowRight } from 'lucide-react';
import { useWorkspace, WorkspaceType } from '@/contexts/workspace-context';
import { Modal } from '@/components/ui/modal';

export function WorkspaceSwitcherModal() {
  const { workspace, setWorkspace, isModalOpen, setIsModalOpen } = useWorkspace();

  function handleSelect(target: WorkspaceType) {
    setWorkspace(target);
    setIsModalOpen(false);
  }

  return (
    <Modal
      isOpen={isModalOpen}
      onClose={() => setIsModalOpen(false)}
      title="Diller-Hub — Alternar Negócio"
      description="Selecione qual operação você deseja gerenciar agora"
    >
      <div className="space-y-3 pt-1">
        {/* Card 1: Renata Diller Semijoias */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelect('semijoias')}
          className={`p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer touch-card flex items-center justify-between ${
            workspace === 'semijoias'
              ? 'border-[#977f5a] bg-[#faf6f0] shadow-sm'
              : 'border-[#dfd5c4] bg-white hover:border-[#977f5a]/60'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#977f5a]/30 bg-[#977f5a]/10 flex items-center justify-center shrink-0 p-1">
              <Image
                src="/logo.jpg"
                alt="Renata Diller Semijoias"
                width={40}
                height={40}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Gem className="w-3.5 h-3.5 text-[#977f5a]" />
                <h3 className="text-sm font-bold text-[#2d251e]">
                  Renata Diller
                </h3>
                <span className="text-[10px] font-bold text-[#977f5a] bg-[#977f5a]/15 px-2 py-0.5 rounded-full">
                  Semijoias
                </span>
              </div>
              <p className="text-xs text-[#766a5e] mt-0.5">
                Vendas, clientes, cobranças e fiado
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {workspace === 'semijoias' ? (
              <div className="w-7 h-7 rounded-full bg-[#977f5a] text-white flex items-center justify-center shadow-xs animate-pop">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            ) : (
              <ArrowRight className="w-5 h-5 text-[#87786b]" />
            )}
          </div>
        </div>

        {/* Card 2: Casa Itaúna Saquarema */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleSelect('casa_itauna')}
          className={`p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer touch-card flex items-center justify-between ${
            workspace === 'casa_itauna'
              ? 'border-[#0369a1] bg-[#f0f9ff] shadow-sm'
              : 'border-[#dfd5c4] bg-white hover:border-[#0369a1]/60'
          }`}
        >
          <div className="flex items-center gap-3.5 min-w-0 pr-2">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-[#0369a1]/30 bg-[#0369a1]/10 flex items-center justify-center shrink-0 p-0.5 shadow-xs">
              <Image
                src="/logo-itauna.jpg"
                alt="Casa Itaúna - Saquarema"
                width={44}
                height={44}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Home className="w-3.5 h-3.5 text-[#0369a1]" />
                <h3 className="text-sm font-bold text-[#0f172a]">
                  Casa Itaúna
                </h3>
                <span className="text-[10px] font-bold text-[#0369a1] bg-[#0369a1]/15 px-2 py-0.5 rounded-full">
                  Temporada
                </span>
              </div>
              <p className="text-xs text-[#64748b] mt-0.5">
                Calendário, reservas, hóspedes e despesas
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {workspace === 'casa_itauna' ? (
              <div className="w-7 h-7 rounded-full bg-[#0369a1] text-white flex items-center justify-center shadow-xs animate-pop">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            ) : (
              <ArrowRight className="w-5 h-5 text-[#64748b]" />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
