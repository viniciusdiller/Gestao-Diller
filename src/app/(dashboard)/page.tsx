import * as React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  ShoppingBag,
  Award,
  MessageCircle,
  ArrowRight,
  PlusCircle,
} from 'lucide-react';
import { getDashboardDataAction } from '../actions/dashboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateBR } from '@/lib/utils';
import { getWhatsAppBillingUrl } from '@/lib/services/whatsapp';

function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-[#dfd5c4]/60 rounded-xl w-1/2" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-24 bg-white/70 rounded-2xl" />
        <div className="h-24 bg-white/70 rounded-2xl" />
        <div className="h-24 bg-white/70 rounded-2xl" />
        <div className="h-24 bg-white/70 rounded-2xl" />
      </div>
      <div className="h-40 bg-white/70 rounded-2xl" />
    </div>
  );
}

async function DashboardContent() {
  const result = await getDashboardDataAction();
  if (!result.success || !result.metrics) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm font-medium text-[#2d251e]">
          Sessão não identificada. Por favor, acesse sua conta.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#977f5a] text-white text-xs font-semibold"
        >
          Acessar Login
        </Link>
      </div>
    );
  }

  const metrics = result.metrics;

  const monthRevenue = metrics?.monthRevenue ?? 0;
  const totalReceivable = metrics?.totalReceivable ?? 0;
  const totalOverdue = metrics?.totalOverdue ?? 0;
  const monthSalesCount = metrics?.monthSalesCount ?? 0;
  const topClients = metrics?.topClients ?? [];
  const overdueAlerts = metrics?.overdueAlerts ?? [];
  const dueSoonAlerts = metrics?.dueSoonAlerts ?? [];
  const monthlyHistory = metrics?.monthlyHistory ?? [];

  // Calcula maior valor do histórico para escala do gráfico
  const maxHistoryValue = Math.max(
    ...monthlyHistory.map((m) => m.total),
    100
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Saudação e Ação Rápida */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#2d251e]">
            Visão Geral
          </h2>
          <p className="text-xs text-[#766a5e]">
            Resumo financeiro do seu negócio
          </p>
        </div>
        <Link
          href="/vendas"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#977f5a] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" /> Nova Venda
        </Link>
      </div>

      {/* Grid de KPIs Compactos (2x2 no mobile) */}
      <div className="grid grid-cols-2 gap-3">
        {/* KPI 1: Faturamento do Mês */}
        <Card className="p-3.5 bg-[#ffffff] border-[#e4dcd0] shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-[#766a5e]">
              Faturamento (Mês)
            </span>
            <div className="p-1 rounded-lg bg-[#977f5a]/15 text-[#977f5a]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-[#2d251e] tracking-tight">
            {formatCurrency(monthRevenue)}
          </div>
          <p className="text-[10px] text-[#766a5e] mt-0.5">
            {monthSalesCount} {monthSalesCount === 1 ? 'venda' : 'vendas'} neste mês
          </p>
        </Card>

        {/* KPI 2: Total a Receber */}
        <Card className="p-3.5 bg-[#ffffff] border-[#e4dcd0] shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-[#766a5e]">
              Total a Receber
            </span>
            <div className="p-1 rounded-lg bg-[#977f5a]/15 text-[#977f5a]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-[#977f5a] tracking-tight">
            {formatCurrency(totalReceivable)}
          </div>
          <p className="text-[10px] text-[#766a5e] mt-0.5">
            Parcelas em aberto
          </p>
        </Card>

        {/* KPI 3: Total em Atraso */}
        <Card className="p-3.5 bg-[#ffffff] border-[#e4dcd0] shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-[#766a5e]">
              Vencidos / Atraso
            </span>
            <div className="p-1 rounded-lg bg-[#b91c1c]/15 text-[#b91c1c]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-[#b91c1c] tracking-tight">
            {formatCurrency(totalOverdue)}
          </div>
          <p className="text-[10px] text-[#b91c1c] mt-0.5 font-medium">
            {overdueAlerts.length} {overdueAlerts.length === 1 ? 'cobrança pendente' : 'cobranças pendentes'}
          </p>
        </Card>

        {/* KPI 4: Vendas Realizadas */}
        <Card className="p-3.5 bg-[#ffffff] border-[#e4dcd0] shadow-xs">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-medium text-[#766a5e]">
              Vendas no Mês
            </span>
            <div className="p-1 rounded-lg bg-[#977f5a]/15 text-[#977f5a]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-[#2d251e] tracking-tight">
            {monthSalesCount}
          </div>
          <p className="text-[10px] text-[#766a5e] mt-0.5">
            Pedidos registrados
          </p>
        </Card>
      </div>

      {/* Alertas Críticos (Vencidos e Vence nos próximos 7 dias) */}
      {(overdueAlerts.length > 0 || dueSoonAlerts.length > 0) && (
        <Card className="border-[#e4dcd0] bg-[#ffffff] shadow-xs overflow-hidden">
          <CardHeader className="p-3.5 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-[#b91c1c]">
                <AlertTriangle className="w-4 h-4 text-[#b91c1c]" /> Alertas de Cobrança
              </CardTitle>
              <Link
                href="/cobrancas"
                className="text-xs text-[#977f5a] font-medium flex items-center gap-0.5 hover:underline"
              >
                Ver tudo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0 space-y-2">
            {overdueAlerts.slice(0, 3).map((inst) => {
              const waUrl = getWhatsAppBillingUrl(inst.client_phone || '', {
                clientName: inst.client_name || 'Cliente',
                amount: inst.amount,
                dueDate: inst.due_date,
                installmentNumber: inst.installment_number,
                totalInstallments: inst.total_installments,
              });

              return (
                <div
                  key={inst.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/70 border border-red-200/80"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#2d251e] truncate">
                        {inst.client_name}
                      </span>
                      <Badge variant="danger" className="text-[10px] px-1.5 py-0">
                        Venceu {formatDateBR(inst.due_date)}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-[#b91c1c] mt-0.5">
                      {formatCurrency(inst.amount)}{' '}
                      <span className="text-[10px] font-normal text-[#766a5e]">
                        (Parc. {inst.installment_number}/{inst.total_installments})
                      </span>
                    </p>
                  </div>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all shrink-0"
                    title="Cobrar pelo WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Cobrar
                  </a>
                </div>
              );
            })}

            {dueSoonAlerts.slice(0, 2).map((inst) => {
              const waUrl = getWhatsAppBillingUrl(inst.client_phone || '', {
                clientName: inst.client_name || 'Cliente',
                amount: inst.amount,
                dueDate: inst.due_date,
                installmentNumber: inst.installment_number,
                totalInstallments: inst.total_installments,
              });

              return (
                <div
                  key={inst.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#2d251e] truncate">
                        {inst.client_name}
                      </span>
                      <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                        Vence {formatDateBR(inst.due_date)}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-[#b45309] mt-0.5">
                      {formatCurrency(inst.amount)}{' '}
                      <span className="text-[10px] font-normal text-[#766a5e]">
                        (Parc. {inst.installment_number}/{inst.total_installments})
                      </span>
                    </p>
                  </div>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#25D366] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all shrink-0"
                    title="Lembrar pelo WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Lembrar
                  </a>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Barras: Histórico de Vendas Mensais (Últimos 6 meses) */}
      <Card className="border-[#e4dcd0] bg-[#ffffff] shadow-xs">
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-sm font-bold text-[#2d251e]">
            Evolução de Vendas (Últimos 6 Meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 pt-2">
          <div className="h-36 flex items-end justify-between gap-2 pt-4 px-1">
            {monthlyHistory.map((item) => {
              const heightPercent = Math.max(
                Math.round((item.total / maxHistoryValue) * 100),
                8
              );

              return (
                <div
                  key={item.monthKey}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                >
                  <span className="text-[9px] font-bold text-[#766a5e]">
                    {item.total > 0 ? `${Math.round(item.total)}` : '0'}
                  </span>
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full max-w-[32px] rounded-t-lg bg-gradient-to-t from-[#977f5a] to-[#b39b75] transition-all duration-300"
                  />
                  <span className="text-[10px] font-medium text-[#766a5e] whitespace-nowrap">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ranking: Top 3 Clientes do Mês */}
      <Card className="border-[#e4dcd0] bg-[#ffffff] shadow-xs">
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-[#2d251e]">
            <Award className="w-4 h-4 text-[#977f5a]" /> Top 3 Clientes do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3.5 pt-0">
          {topClients.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#766a5e]">
              Nenhuma venda registrada este mês ainda.
            </div>
          ) : (
            <div className="divide-y divide-[#ebdcca]">
              {topClients.map((client, index) => (
                <div
                  key={client.clientId}
                  className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? 'bg-[#977f5a] text-white shadow-xs'
                          : index === 1
                          ? 'bg-[#d8c8b0] text-[#2d251e]'
                          : 'bg-[#ebdcca] text-[#766a5e]'
                      }`}
                    >
                      {index + 1}º
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#2d251e]">
                        {client.clientName}
                      </p>
                      <p className="text-[10px] text-[#766a5e]">
                        {client.salesCount} {client.salesCount === 1 ? 'compra' : 'compras'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#977f5a]">
                    {formatCurrency(client.totalSpent)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <React.Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </React.Suspense>
  );
}

