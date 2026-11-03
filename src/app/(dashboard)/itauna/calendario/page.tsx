'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  PlusCircle,
  MessageCircle,
  Clock,
  DollarSign,
  User,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { LoadingState } from '@/components/ui/loading-state';
import { formatCurrency, formatDateBR, sanitizePhoneForWhatsApp } from '@/lib/utils';

interface ReservaItem {
  id: string;
  data_checkin: string;
  data_checkout: string;
  num_diarias: number;
  valor_diaria: number;
  taxa_limpeza: number;
  taxa_plataforma: number;
  origem: string;
  valor_total: number;
  status: string;
  status_pagamento: string;
  valor_pago: number;
  observacoes?: string | null;
  aluguel_hospedes?: {
    id: string;
    nome: string;
    telefone?: string | null;
  };
}

export default function ItaunaCalendarioPage() {
  const [loading, setLoading] = React.useState(true);
  const [currentDate, setCurrentDate] = React.useState(() => new Date());
  const [reservas, setReservas] = React.useState<ReservaItem[]>([]);
  const [selectedReserva, setSelectedReserva] = React.useState<ReservaItem | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 a 11
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const loadReservas = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/aluguel/reservas?month=${monthStr}`);
      const data = await res.json();
      if (data.success) {
        setReservas(data.reservas || []);
      }
    } catch (err) {
      console.error('Erro ao buscar reservas do mês:', err);
    } finally {
      setLoading(false);
    }
  }, [monthStr]);

  React.useEffect(() => {
    loadReservas();
  }, [loadReservas]);

  function handlePrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

  // Gera a matriz de dias do mês
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Mapeamento de ocupação por data YYYY-MM-DD
  const daysMap = React.useMemo(() => {
    const map = new Map<string, { isOccupied: boolean; isCheckin: boolean; isCheckout: boolean; reserva?: ReservaItem }>();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const foundReserva = reservas.find((r) => {
        if (r.status === 'cancelada') return false;
        return r.data_checkin <= dayStr && dayStr < r.data_checkout;
      });

      const isCheckin = reservas.some((r) => r.status !== 'cancelada' && r.data_checkin === dayStr);
      const isCheckout = reservas.some((r) => r.status !== 'cancelada' && r.data_checkout === dayStr);

      map.set(dayStr, {
        isOccupied: !!foundReserva,
        isCheckin,
        isCheckout,
        reserva: foundReserva,
      });
    }

    return map;
  }, [reservas, daysInMonth, year, month]);

  // Contagem de noites ocupadas no mês
  const occupiedDaysCount = React.useMemo(() => {
    let count = 0;
    daysMap.forEach((info) => {
      if (info.isOccupied) count++;
    });
    return count;
  }, [daysMap]);

  const occupancyRate = Math.round((occupiedDaysCount / daysInMonth) * 100);

  const selectedPhone = sanitizePhoneForWhatsApp(selectedReserva?.aluguel_hospedes?.telefone || '');
  const selectedWaUrl = selectedPhone ? `https://wa.me/${selectedPhone}` : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header do Calendário */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#0369a1]" /> Calendário Visual
          </h2>
          <p className="text-xs sm:text-sm text-[#64748b]">
            Visualização de ocupação estilo Airbnb para controle da Casa Itaúna
          </p>
        </div>

        {/* Navegação entre Meses */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-[#cbd5e1] shadow-2xs self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] touch-pill active:scale-90 transition-all cursor-pointer"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-[#0f172a] px-3 min-w-[130px] text-center capitalize">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] touch-pill active:scale-90 transition-all cursor-pointer"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barra de Status e Taxa de Ocupação */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-white border border-[#cbd5e1] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#64748b] uppercase">Noites Alugadas</p>
            <p className="text-base font-extrabold text-[#0369a1]">{occupiedDaysCount} de {daysInMonth}</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#0369a1]" />
        </div>

        <div className="p-3 rounded-2xl bg-white border border-[#cbd5e1] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#64748b] uppercase">Ocupação do Mês</p>
            <p className="text-base font-extrabold text-[#0f172a]">{occupancyRate}%</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]" />
        </div>

        <div className="col-span-2 p-3 rounded-2xl bg-[#f8fafc] border border-[#cbd5e1] flex items-center justify-around text-xs font-semibold text-[#475569]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#16a34a]/20 border border-[#16a34a]" /> Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#f97316] text-white" /> Ocupado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-400" /> Check-in/out
          </span>
        </div>
      </div>

      {/* Grade do Calendário Mensal */}
      <Card className="p-3 sm:p-5 bg-white border-[#cbd5e1] shadow-sm">
        {loading ? (
          <LoadingState message="Atualizando calendário de reservas..." />
        ) : (
          <div>
            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-[#64748b] uppercase tracking-wider">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Células de Dias */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Espaços em branco antes do 1º dia */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-16 sm:h-20 rounded-xl bg-neutral-50/40 border border-transparent" />
              ))}

              {/* Dias do Mês */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const info = daysMap.get(dayStr);
                const isOccupied = info?.isOccupied;
                const isCheckin = info?.isCheckin;
                const isCheckout = info?.isCheckout;
                const reserva = info?.reserva;

                return (
                  <div
                    key={dayStr}
                    onClick={() => {
                      if (reserva) {
                        setSelectedReserva(reserva);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`h-16 sm:h-20 p-1 sm:p-2 rounded-xl sm:rounded-2xl border transition-all duration-150 flex flex-col justify-between touch-card cursor-pointer select-none ${
                      isOccupied
                        ? 'bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white border-[#f97316] shadow-xs active:scale-95'
                        : isCheckout
                        ? 'bg-[#fff7ed] border-[#fed7aa] text-[#0f172a] hover:bg-[#ffedd5]'
                        : 'bg-[#f0fdf4]/50 border-[#bbf7d0] text-[#0f172a] hover:bg-[#dcfce7]/60 active:scale-95'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs sm:text-sm font-extrabold ${isOccupied ? 'text-white' : 'text-[#0f172a]'}`}>
                        {dayNum}
                      </span>
                      {isCheckin && (
                        <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded-md bg-amber-400 text-[#0f172a]">
                          Entrada
                        </span>
                      )}
                      {isCheckout && !isOccupied && (
                        <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded-md bg-blue-200 text-[#0369a1]">
                          Saída
                        </span>
                      )}
                    </div>

                    {isOccupied && reserva ? (
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold truncate leading-tight">
                          {reserva.aluguel_hospedes?.nome?.split(' ')[0] || 'Alugado'}
                        </p>
                        <p className="text-[9px] text-white/90 truncate hidden sm:block">
                          {formatCurrency(Number(reserva.valor_diaria))}/dia
                        </p>
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-[#16a34a] hidden sm:block">
                        Livre
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes da Reserva ao Tocar no Dia Ocupado */}
      <Modal
        isOpen={!!selectedReserva}
        onClose={() => setSelectedReserva(null)}
        title="Detalhes da Reserva"
        description="Informações completas do período de locação"
      >
        {selectedReserva && (
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-2xl bg-[#f0f9ff] border border-[#bae6fd] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0369a1] text-white flex items-center justify-center font-black">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">
                    {selectedReserva.aluguel_hospedes?.nome}
                  </h3>
                  <p className="text-xs text-[#0369a1] font-semibold">
                    Origem: <span className="uppercase">{selectedReserva.origem}</span>
                  </p>
                </div>
              </div>

              {selectedWaUrl && (
                <a
                  href={selectedWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#1fa851] active:scale-95 transition-all shadow-xs"
                  title="Chamar no WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#cbd5e1]">
                <span className="text-[#64748b]">Check-in</span>
                <p className="font-bold text-[#0f172a] text-sm mt-0.5">
                  {formatDateBR(selectedReserva.data_checkin)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#cbd5e1]">
                <span className="text-[#64748b]">Check-out</span>
                <p className="font-bold text-[#0f172a] text-sm mt-0.5">
                  {formatDateBR(selectedReserva.data_checkout)}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-[#cbd5e1] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b]">
                  {selectedReserva.num_diarias} diárias x {formatCurrency(Number(selectedReserva.valor_diaria))}
                </span>
                <span className="font-semibold text-[#0f172a]">
                  {formatCurrency(selectedReserva.num_diarias * Number(selectedReserva.valor_diaria))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">Taxa de Limpeza</span>
                <span className="font-semibold text-[#0f172a]">
                  {formatCurrency(Number(selectedReserva.taxa_limpeza))}
                </span>
              </div>
              {Number(selectedReserva.taxa_plataforma) > 0 && (
                <div className="flex justify-between text-[#ef4444]">
                  <span>Comissão Plataforma ({selectedReserva.origem})</span>
                  <span className="font-semibold">
                    - {formatCurrency(Number(selectedReserva.taxa_plataforma))}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-[#f1f5f9] flex justify-between text-sm font-black">
                <span>Total da Reserva</span>
                <span className="text-[#0369a1]">
                  {formatCurrency(Number(selectedReserva.valor_total))}
                </span>
              </div>
            </div>

            {selectedReserva.observacoes && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold">Observações:</span> {selectedReserva.observacoes}
              </div>
            )}

            <div className="pt-1 flex gap-2">
              <Link href="/itauna/reservas" className="w-full">
                <Button className="w-full bg-[#0369a1] text-white hover:bg-[#0284c7] font-bold">
                  Gerenciar Reserva
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
