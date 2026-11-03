'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  PlusCircle,
  MessageCircle,
  User,
  ShieldCheck,
  Percent,
  Home,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { LoadingState } from '@/components/ui/loading-state';
import {
  formatCurrency,
  formatDateBR,
  sanitizePhoneForWhatsApp,
  getTodayDateString,
} from '@/lib/utils';

interface ReservaItem {
  id: string;
  data_checkin: string;
  data_checkout: string;
  num_hospedes?: number;
  num_diarias: number;
  valor_diaria: number;
  taxa_limpeza: number;
  taxa_plataforma_percentual?: number;
  taxa_plataforma: number;
  tem_comissao_dani?: boolean;
  taxa_dani_percentual?: number;
  valor_comissao_dani?: number;
  lucro_liquido_real?: number;
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
  const [selectedFreeDate, setSelectedFreeDate] = React.useState<string | null>(null);
  const [selectedTurnaround, setSelectedTurnaround] = React.useState<{
    date: string;
    checkoutReserva: ReservaItem;
    checkinReserva: ReservaItem;
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0 a 11
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const todayStr = getTodayDateString();

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

  function handleToday() {
    setCurrentDate(new Date());
  }

  // Primeiro dia da semana do mês (0 = Domingo)
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // Quantidade exata de dias no mês
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Mapeamento de ocupação rigoroso por data YYYY-MM-DD
  const daysMap = React.useMemo(() => {
    const map = new Map<
      string,
      {
        isOccupied: boolean;
        isCheckin: boolean;
        isCheckout: boolean;
        isTurnaround: boolean;
        activeReserva?: ReservaItem;
        checkinReserva?: ReservaItem;
        checkoutReserva?: ReservaItem;
      }
    >();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // A noite do dia pertence a uma reserva se: checkin <= dayStr && dayStr < checkout
      const activeReserva = reservas.find((r) => {
        if (r.status === 'cancelada') return false;
        return r.data_checkin <= dayStr && dayStr < r.data_checkout;
      });

      const checkinReserva = reservas.find(
        (r) => r.status !== 'cancelada' && r.data_checkin === dayStr
      );
      const checkoutReserva = reservas.find(
        (r) => r.status !== 'cancelada' && r.data_checkout === dayStr
      );

      // Troca de Hóspede (Turnaround): saída de um hóspede e entrada de outro no mesmo dia
      const isTurnaround = Boolean(checkinReserva && checkoutReserva);

      map.set(dayStr, {
        isOccupied: Boolean(activeReserva),
        isCheckin: Boolean(checkinReserva),
        isCheckout: Boolean(checkoutReserva),
        isTurnaround,
        activeReserva,
        checkinReserva,
        checkoutReserva,
      });
    }

    return map;
  }, [reservas, daysInMonth, year, month]);

  // Contagem de noites alugadas no mês
  const occupiedDaysCount = React.useMemo(() => {
    let count = 0;
    daysMap.forEach((info) => {
      if (info.isOccupied) count++;
    });
    return count;
  }, [daysMap]);

  const occupancyRate = Math.round((occupiedDaysCount / daysInMonth) * 100);

  const selectedPhone = sanitizePhoneForWhatsApp(
    selectedReserva?.aluguel_hospedes?.telefone || ''
  );
  const selectedWaUrl = selectedPhone ? `https://wa.me/${selectedPhone}` : null;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header do Calendário com Navegação */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#0369a1]" /> Calendário de Ocupação
          </h2>
          <p className="text-xs sm:text-sm text-[#64748b]">
            Visualização estilo Airbnb com disponibilidade e reservas da Casa Itaúna
          </p>
        </div>

        {/* Controles de Navegação */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-[#e2e8f0] text-[#0f172a] hover:bg-[#f8fafc] active:scale-95 transition-all shadow-2xs"
          >
            Hoje
          </button>
          <div className="flex items-center bg-white p-1 rounded-2xl border border-[#e2e8f0] shadow-2xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] active:scale-90 transition-all cursor-pointer"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-[#0f172a] px-3 min-w-[125px] text-center capitalize">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] active:scale-90 transition-all cursor-pointer"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Indicadores Suaves de Ocupação */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
              Noites Alugadas
            </p>
            <p className="text-base font-extrabold text-[#0369a1]">
              {occupiedDaysCount}{' '}
              <span className="text-xs font-normal text-[#64748b]">/ {daysInMonth} dias</span>
            </p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#0369a1]" />
        </div>

        <div className="p-3 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-[#64748b] uppercase tracking-wider">
              Taxa de Ocupação
            </p>
            <p className="text-base font-extrabold text-[#0f172a]">{occupancyRate}%</p>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
        </div>

        <div className="col-span-2 p-3 rounded-2xl bg-white border border-[#e2e8f0] shadow-2xs flex flex-wrap items-center justify-around gap-2 text-xs font-medium text-[#475569]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
            Livre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
            Alugado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
            Check-in / Saída
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0369a1]" />
            Troca no Dia
          </span>
        </div>
      </div>

      {/* Grade do Calendário Mensal */}
      <Card className="p-3 sm:p-5 bg-white border-[#e2e8f0] shadow-2xs">
        {loading ? (
          <LoadingState message="Carregando ocupação da Casa Itaúna..." />
        ) : (
          <div>
            {/* Dias da Semana */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">
              <span className="text-rose-500">Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span className="text-sky-600">Sáb</span>
            </div>

            {/* Células de Dias */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {/* Espaços em branco antes do 1º dia */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="h-16 sm:h-20 rounded-xl bg-slate-50/40 border border-transparent"
                />
              ))}

              {/* Dias do Mês */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const info = daysMap.get(dayStr);
                const isToday = dayStr === todayStr;

                const isOccupied = Boolean(info?.isOccupied);
                const isCheckin = Boolean(info?.isCheckin);
                const isCheckout = Boolean(info?.isCheckout);
                const isTurnaround = Boolean(info?.isTurnaround);

                // A reserva prioritária ao clicar (ou troca de hóspedes)
                const targetReserva =
                  info?.activeReserva || info?.checkinReserva || info?.checkoutReserva;

                return (
                  <div
                    key={dayStr}
                    onClick={() => {
                      if (isTurnaround && info?.checkoutReserva && info?.checkinReserva) {
                        setSelectedTurnaround({
                          date: dayStr,
                          checkoutReserva: info.checkoutReserva,
                          checkinReserva: info.checkinReserva,
                        });
                      } else if (targetReserva) {
                        setSelectedReserva(targetReserva);
                      } else {
                        setSelectedFreeDate(dayStr);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`h-18 sm:h-22 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all duration-150 flex flex-col justify-between cursor-pointer select-none relative overflow-hidden ${
                      isToday ? 'ring-2 ring-[#0369a1] ring-offset-1 z-10' : ''
                    } ${
                      isTurnaround
                        ? 'bg-[linear-gradient(135deg,#f0f9ff_48%,#e2e8f0_50%,#ecfdf5_52%)] border-[#38bdf8] text-[#0f172a] hover:border-[#0284c7] shadow-xs'
                        : isOccupied
                        ? 'bg-amber-50/70 border-amber-200/90 text-amber-950 hover:bg-amber-100/80 active:scale-95 shadow-2xs'
                        : isCheckout
                        ? 'bg-sky-50/50 border-sky-200/80 text-sky-950 hover:bg-sky-100/60 active:scale-95'
                        : isCheckin
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950 hover:bg-emerald-100/60 active:scale-95'
                        : 'bg-white border-[#e2e8f0] text-[#1e293b] hover:bg-[#f8fafc] hover:border-[#38bdf8]/40 active:scale-95'
                    }`}
                  >
                    {/* Linha Superior: Dia e Chips de Entrada/Saída/Troca */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isToday
                            ? 'text-[#0369a1]'
                            : isTurnaround
                            ? 'text-[#0369a1]'
                            : isOccupied
                            ? 'text-amber-950'
                            : 'text-[#1e293b]'
                        }`}
                      >
                        {dayNum}
                      </span>

                      <div className="flex items-center gap-0.5">
                        {isTurnaround ? (
                          <div className="flex items-center gap-0.5">
                            <span className="text-[7px] sm:text-[8px] font-black uppercase px-1 py-0.2 rounded bg-sky-200 text-sky-900 border border-sky-300">
                              ↑ 11h
                            </span>
                            <span className="text-[7px] sm:text-[8px] font-black uppercase px-1 py-0.2 rounded bg-emerald-200 text-emerald-900 border border-emerald-300">
                              ↓ 14h
                            </span>
                          </div>
                        ) : (
                          <>
                            {isCheckin && (
                              <span className="text-[8px] sm:text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                Entrada
                              </span>
                            )}
                            {isCheckout && !isOccupied && (
                              <span className="text-[8px] sm:text-[9px] font-bold uppercase px-1 py-0.2 rounded bg-sky-100 text-sky-800">
                                Saída
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Conteúdo Inferior: Nome do Hóspede ou Indicador Livre */}
                    {isTurnaround && info?.checkoutReserva && info?.checkinReserva ? (
                      <div className="min-w-0 space-y-0.5 mt-auto">
                        <div className="text-[8px] sm:text-[9px] font-bold text-sky-900 bg-sky-100/90 px-1 py-0.5 rounded border border-sky-200/60 truncate leading-none">
                          ↑ {info.checkoutReserva.aluguel_hospedes?.nome?.split(' ')[0]}
                        </div>
                        <div className="text-[8px] sm:text-[9px] font-bold text-emerald-900 bg-emerald-100/90 px-1 py-0.5 rounded border border-emerald-200/60 truncate leading-none">
                          ↓ {info.checkinReserva.aluguel_hospedes?.nome?.split(' ')[0]}
                        </div>
                      </div>
                    ) : isOccupied && info?.activeReserva ? (
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-semibold truncate text-amber-900 leading-tight">
                          {info.activeReserva.aluguel_hospedes?.nome?.split(' ')[0] || 'Alugado'}
                        </p>
                        <p className="text-[9px] text-[#64748b] truncate hidden sm:block">
                          {info.activeReserva.origem.toUpperCase()}
                        </p>
                      </div>
                    ) : isCheckout && info?.checkoutReserva ? (
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] font-medium text-sky-700 truncate">
                          Saída: {info.checkoutReserva.aluguel_hospedes?.nome?.split(' ')[0]}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-[#10b981] font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        <span className="hidden sm:inline">Livre</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Modal de Detalhes da Reserva ao Clicar no Dia Ocupado */}
      <Modal
        isOpen={Boolean(selectedReserva)}
        onClose={() => setSelectedReserva(null)}
        title="Detalhes da Reserva"
        description="Informações completas e breakdown financeiro da locação"
      >
        {selectedReserva && (
          <div className="space-y-4 pt-1">
            {/* Cartão do Hóspede */}
            <div className="p-3.5 rounded-2xl bg-[#f0f9ff] border border-[#bae6fd] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0369a1] text-white flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0f172a]">
                    {selectedReserva.aluguel_hospedes?.nome}
                  </h3>
                  <p className="text-xs text-[#0369a1] font-medium">
                    Canal: <span className="uppercase font-semibold">{selectedReserva.origem}</span>
                  </p>
                </div>
              </div>

              {selectedWaUrl && (
                <a
                  href={selectedWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl bg-[#25D366] text-white hover:bg-[#1fa851] active:scale-95 transition-all shadow-2xs"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>

            {/* Período de Estadia e Hóspedes */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-[#64748b] block text-[10px]">Check-in</span>
                <p className="font-bold text-[#0f172a] text-xs mt-0.5">
                  {formatDateBR(selectedReserva.data_checkin)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-[#64748b] block text-[10px]">Check-out</span>
                <p className="font-bold text-[#0f172a] text-xs mt-0.5">
                  {formatDateBR(selectedReserva.data_checkout)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                <span className="text-[#64748b] block text-[10px]">Hóspedes</span>
                <p className="font-bold text-[#0369a1] text-xs mt-0.5">
                  {selectedReserva.num_hospedes || 1} pessoas
                </p>
              </div>
            </div>

            {/* Breakdown Financeiro Transparente */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#e2e8f0] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748b]">
                  Diárias ({selectedReserva.num_diarias} noites):
                </span>
                <span className="font-semibold text-[#0f172a]">
                  {selectedReserva.num_diarias} x {formatCurrency(Number(selectedReserva.valor_diaria))}
                </span>
              </div>

              <div className="pt-1.5 border-t border-[#f1f5f9] flex justify-between font-bold text-[#0f172a]">
                <span>Total da Reserva</span>
                <span className="text-[#0369a1] font-extrabold">{formatCurrency(Number(selectedReserva.valor_total))}</span>
              </div>

              {Number(selectedReserva.taxa_plataforma) > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>
                    (-) Taxa {selectedReserva.origem.toUpperCase()} ({selectedReserva.taxa_plataforma_percentual || 16}%)
                  </span>
                  <span className="font-semibold">
                    - {formatCurrency(Number(selectedReserva.taxa_plataforma))}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>(-) Despesa de Faxina</span>
                <span className="font-medium">
                  - {formatCurrency(Number(selectedReserva.taxa_limpeza || 180))}
                </span>
              </div>

              {selectedReserva.tem_comissao_dani && (
                <div className="flex justify-between text-amber-700">
                  <span>(-) Comissão da Dani (20% sobre saldo)</span>
                  <span className="font-semibold">
                    - {formatCurrency(Number(selectedReserva.valor_comissao_dani || 0))}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-[#e2e8f0] flex justify-between text-sm font-extrabold text-[#0369a1]">
                <span>Lucro Líquido Real</span>
                <span>
                  {formatCurrency(
                    Number(
                      selectedReserva.lucro_liquido_real ??
                        (selectedReserva.valor_total - selectedReserva.taxa_plataforma)
                    )
                  )}
                </span>
              </div>
            </div>

            {selectedReserva.observacoes && (
              <div className="p-3 rounded-xl bg-slate-50 border border-[#e2e8f0] text-xs text-[#475569]">
                <span className="font-bold text-[#0f172a]">Notas:</span> {selectedReserva.observacoes}
              </div>
            )}

            <div className="pt-1">
              <Link href="/itauna/reservas" className="w-full">
                <Button className="w-full bg-[#0369a1] text-white hover:bg-[#0284c7] font-semibold">
                  Gerenciar Reserva Completa
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal para Troca de Hóspedes no Mesmo Dia (Turnaround) */}
      <Modal
        isOpen={Boolean(selectedTurnaround)}
        onClose={() => setSelectedTurnaround(null)}
        title="Troca de Hóspedes no Dia"
        description={
          selectedTurnaround
            ? `Ocorrências de ${formatDateBR(selectedTurnaround.date)} (Saída pela manhã e Entrada à tarde)`
            : ''
        }
      >
        {selectedTurnaround && (
          <div className="space-y-4 pt-1">
            {/* Alerta de Faxina de Troca */}
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Janela de Faxina de Troca: 11h às 14h</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Saída do hóspede anterior pela manhã e check-in do novo hóspede à tarde.
                  Taxa de Faxina fixa: <strong>R$ 180,00</strong>.
                </p>
              </div>
            </div>

            {/* Card 1: Check-out (Saída) */}
            <div className="p-3.5 rounded-2xl bg-white border border-[#38bdf8] shadow-2xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                  Saída (Check-out até 11h)
                </span>
                <span className="text-xs font-bold text-[#0369a1]">
                  {formatCurrency(Number(selectedTurnaround.checkoutReserva.valor_total))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0f172a]">
                    {selectedTurnaround.checkoutReserva.aluguel_hospedes?.nome}
                  </h4>
                  <p className="text-[11px] text-[#64748b]">
                    {selectedTurnaround.checkoutReserva.num_diarias} noites • Canal:{' '}
                    <strong className="uppercase">{selectedTurnaround.checkoutReserva.origem}</strong>
                  </p>
                </div>
                {sanitizePhoneForWhatsApp(selectedTurnaround.checkoutReserva.aluguel_hospedes?.telefone || '') && (
                  <a
                    href={`https://wa.me/${sanitizePhoneForWhatsApp(selectedTurnaround.checkoutReserva.aluguel_hospedes?.telefone || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1fa851] transition-colors shadow-2xs"
                    title="Falar no WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const r = selectedTurnaround.checkoutReserva;
                  setSelectedTurnaround(null);
                  setSelectedReserva(r);
                }}
                className="w-full text-xs font-semibold h-8 mt-1 border-slate-200 text-[#0369a1] hover:bg-sky-50"
              >
                Ver Detalhes Financeiros da Saída
              </Button>
            </div>

            {/* Card 2: Check-in (Entrada) */}
            <div className="p-3.5 rounded-2xl bg-white border border-emerald-300 shadow-2xs space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Entrada (Check-in a partir de 14h)
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  {formatCurrency(Number(selectedTurnaround.checkinReserva.valor_total))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0f172a]">
                    {selectedTurnaround.checkinReserva.aluguel_hospedes?.nome}
                  </h4>
                  <p className="text-[11px] text-[#64748b]">
                    {selectedTurnaround.checkinReserva.num_diarias} noites • {selectedTurnaround.checkinReserva.num_hospedes || 1} hóspede(s) • Canal:{' '}
                    <strong className="uppercase">{selectedTurnaround.checkinReserva.origem}</strong>
                  </p>
                </div>
                {sanitizePhoneForWhatsApp(selectedTurnaround.checkinReserva.aluguel_hospedes?.telefone || '') && (
                  <a
                    href={`https://wa.me/${sanitizePhoneForWhatsApp(selectedTurnaround.checkinReserva.aluguel_hospedes?.telefone || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-[#25D366] text-white hover:bg-[#1fa851] transition-colors shadow-2xs"
                    title="Falar no WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </a>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const r = selectedTurnaround.checkinReserva;
                  setSelectedTurnaround(null);
                  setSelectedReserva(r);
                }}
                className="w-full text-xs font-semibold h-8 mt-1 border-slate-200 text-emerald-800 hover:bg-emerald-50"
              >
                Ver Detalhes Financeiros da Entrada
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal para Dia Livre (Ação Rápida de Agendar) */}
      <Modal
        isOpen={Boolean(selectedFreeDate)}
        onClose={() => setSelectedFreeDate(null)}
        title="Dia Disponível"
        description="A Casa Itaúna está livre nesta data"
      >
        {selectedFreeDate && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto" />
              <p className="text-sm font-bold text-emerald-950">
                {formatDateBR(selectedFreeDate)}
              </p>
              <p className="text-xs text-emerald-800">
                Nenhuma reserva cadastrada para este dia.
              </p>
            </div>

            <Link href={`/itauna/reservas?checkin=${selectedFreeDate}`} className="w-full block">
              <Button className="w-full bg-[#0369a1] text-white hover:bg-[#0284c7] font-semibold flex items-center justify-center gap-2">
                <PlusCircle className="w-4 h-4" /> Criar Reserva a partir deste dia
              </Button>
            </Link>
          </div>
        )}
      </Modal>
    </div>
  );
}
