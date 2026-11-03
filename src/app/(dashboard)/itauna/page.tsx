'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Waves,
  CalendarCheck,
  CalendarX,
  DollarSign,
  TrendingUp,
  Receipt,
  CalendarDays,
  KeyRound,
  Users,
  PlusCircle,
  MessageCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { formatCurrency, formatDateBR, sanitizePhoneForWhatsApp } from '@/lib/utils';

interface VacancyInfo {
  isOccupied: boolean;
  statusLabel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reservation?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkinToday?: any;
}

interface MonthlyMetrics {
  faturamentoBruto: number;
  totalComissoes: number;
  totalDespesas: number;
  lucroLiquidoReal: number;
  reservasCount: number;
  despesasCount: number;
}

export default function ItaunaDashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [vacancy, setVacancy] = React.useState<VacancyInfo | null>(null);
  const [metrics, setMetrics] = React.useState<MonthlyMetrics | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [upcomingCheckins, setUpcomingCheckins] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [upcomingCheckouts, setUpcomingCheckouts] = React.useState<any[]>([]);

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aluguel/dashboard');
      const data = await res.json();
      if (data.success) {
        setVacancy(data.vacancy);
        setMetrics(data.metrics);
        setUpcomingCheckins(data.upcomingCheckins || []);
        setUpcomingCheckouts(data.upcomingCheckouts || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard da Casa Itaúna:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <LoadingState message="Carregando Casa Itaúna..." />;
  }

  const isOccupied = vacancy?.isOccupied;
  const activeReservation = vacancy?.reservation;
  const activePhone = sanitizePhoneForWhatsApp(activeReservation?.hospede_telefone || '');
  const activeWaUrl = activePhone ? `https://wa.me/${activePhone}` : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header com Boas-Vindas */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a]">
              Casa Itaúna
            </h2>
            <span className="text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Saquarema / RJ
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#64748b] mt-0.5">
            Controle de ocupação, diárias e lucro real da temporada
          </p>
        </div>

        <Link href="/itauna/reservas">
          <Button size="sm" className="bg-[#0369a1] hover:bg-[#0284c7] text-white shadow-xs gap-1.5 text-xs font-bold">
            <PlusCircle className="w-4 h-4" /> Nova Reserva
          </Button>
        </Link>
      </div>

      {/* HERO CARD: Status de Vacância (O Coração da Visibilidade) */}
      <div
        className={`p-4 sm:p-5 rounded-3xl border transition-all duration-300 shadow-2xs touch-card animate-slide-up ${
          isOccupied
            ? 'bg-white border-amber-200'
            : 'bg-white border-emerald-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                isOccupied ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isOccupied ? (
                <CalendarX className="w-6 h-6 stroke-[2]" />
              ) : (
                <CalendarCheck className="w-6 h-6 stroke-[2]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
                  Status de Hoje
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    isOccupied
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOccupied ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}
                  />
                  {isOccupied ? 'Ocupada Hoje' : 'Livre Hoje'}
                </span>
              </div>

              {isOccupied && activeReservation ? (
                <div className="mt-1">
                  <h3 className="text-sm sm:text-base font-bold text-[#0f172a]">
                    Hóspede: {activeReservation.hospede_nome}
                  </h3>
                  <p className="text-xs text-[#64748b] font-medium">
                    Check-out em{' '}
                    <strong className="text-[#0f172a]">
                      {formatDateBR(activeReservation.data_checkout)}
                    </strong>
                  </p>
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-medium text-emerald-800 mt-0.5">
                  A casa está livre e pronta para locação imediata.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            {isOccupied && activeWaUrl && (
              <a
                href={activeWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold active:scale-95 transition-all shadow-2xs"
              >
                <MessageCircle className="w-4 h-4" />
                Falar no WhatsApp
              </a>
            )}
            <Link
              href="/itauna/calendario"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#f8fafc] text-[#0369a1] border border-[#e2e8f0] text-xs font-semibold active:scale-95 transition-all shadow-2xs"
            >
              <CalendarDays className="w-4 h-4" />
              Ver Calendário
            </Link>
          </div>
        </div>
      </div>

      {/* Grid de KPIs Financeiros (3 Cards de Alto Destaque) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* KPI 1: Faturamento Bruto */}
        <Card className="p-4 bg-white border-[#e2e8f0] shadow-2xs touch-card animate-slide-up stagger-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-[#64748b]">
              Faturamento Bruto
            </span>
            <div className="p-1.5 rounded-xl bg-[#f0f9ff] text-[#0369a1]">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0f172a] tracking-tight mt-1">
            {formatCurrency(metrics?.faturamentoBruto || 0)}
          </div>
          <p className="text-[11px] text-[#64748b] mt-0.5">
            {metrics?.reservasCount || 0} reserva(s) no mês
          </p>
        </Card>

        {/* KPI 2: Total de Despesas do Mês */}
        <Card className="p-4 bg-white border-[#e2e8f0] shadow-2xs touch-card animate-slide-up stagger-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-[#64748b]">
              Despesas Operacionais
            </span>
            <div className="p-1.5 rounded-xl bg-rose-50 text-rose-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight mt-1">
            {formatCurrency(metrics?.totalDespesas || 0)}
          </div>
          <p className="text-[11px] text-[#64748b] mt-0.5">
            Luz, água, internet e reparos
          </p>
        </Card>

        {/* KPI 3: Lucro Líquido Real (Destaque Principal) */}
        <Card className="p-4 bg-[#f0f9ff]/70 border border-[#bae6fd] shadow-2xs touch-card animate-slide-up stagger-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#0369a1]">
              Lucro Líquido Real
            </span>
            <div className="p-1.5 rounded-xl bg-[#0369a1] text-white shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0369a1] tracking-tight mt-1">
            {formatCurrency(metrics?.lucroLiquidoReal || 0)}
          </div>
          <p className="text-[11px] text-[#64748b] mt-0.5">
            Após taxas de plataformas, faxina e comissões
          </p>
        </Card>
      </div>

      {/* Grid Inferior: Próximos Check-ins e Check-outs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Próximos Check-ins */}
        <Card className="border-[#cbd5e1] bg-white shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-[#f1f5f9]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-[#0f172a]">
                <KeyRound className="w-4 h-4 text-[#0369a1]" /> Próximos Check-ins
              </CardTitle>
              <Link
                href="/itauna/reservas"
                className="text-xs text-[#0369a1] font-bold flex items-center gap-0.5 hover:underline"
              >
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-3 space-y-2.5">
            {upcomingCheckins.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#64748b]">
                Nenhum check-in agendado para os próximos dias.
              </div>
            ) : (
              upcomingCheckins.map((res, idx) => (
                <div
                  key={res.id}
                  className={`flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] touch-card animate-slide-up stagger-${idx + 1}`}
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-[#0f172a] truncate">
                      {res.aluguel_hospedes?.nome || 'Hóspede'}
                    </h4>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      Entrada: <strong className="text-[#0369a1]">{formatDateBR(res.data_checkin)}</strong> ({res.num_diarias} noites)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-[#0369a1] border-[#0369a1]/30">
                      {res.origem}
                    </Badge>
                    <p className="text-xs font-bold text-[#0f172a] mt-1">
                      {formatCurrency(Number(res.valor_total))}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Próximos Check-outs */}
        <Card className="border-[#cbd5e1] bg-white shadow-xs">
          <CardHeader className="p-4 pb-2 border-b border-[#f1f5f9]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-[#0f172a]">
                <Clock className="w-4 h-4 text-[#f97316]" /> Próximos Check-outs
              </CardTitle>
              <Link
                href="/itauna/reservas"
                className="text-xs text-[#0369a1] font-bold flex items-center gap-0.5 hover:underline"
              >
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-3 space-y-2.5">
            {upcomingCheckouts.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#64748b]">
                Nenhum check-out recente agendado.
              </div>
            ) : (
              upcomingCheckouts.map((res, idx) => (
                <div
                  key={res.id}
                  className={`flex items-center justify-between p-3 rounded-2xl bg-[#fff7ed]/50 border border-[#fed7aa] touch-card animate-slide-up stagger-${idx + 1}`}
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-[#0f172a] truncate">
                      {res.aluguel_hospedes?.nome || 'Hóspede'}
                    </h4>
                    <p className="text-[11px] text-[#64748b] mt-0.5">
                      Saída: <strong className="text-[#f97316]">{formatDateBR(res.data_checkout)}</strong>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-[#64748b]">
                      Taxa Limpeza: {formatCurrency(Number(res.taxa_limpeza))}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

