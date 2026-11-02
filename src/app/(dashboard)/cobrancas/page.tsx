'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  MessageCircle,
  Phone,
} from 'lucide-react';
import {
  getInstallmentsAction,
  markInstallmentPaidAction,
} from '../../actions/installments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { CurrencyInput } from '@/components/ui/currency-input';
import { formatCurrency, formatDateBR } from '@/lib/utils';
import { getWhatsAppBillingUrl, sanitizePhoneForWhatsApp } from '@/lib/services/whatsapp';
import { PaymentMethod } from '@/lib/validations';

type TabType = 'overdue' | 'today' | 'soon' | 'paid' | 'all';

export default function CobrancasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installments, setInstallments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabType>('overdue');

  // Modal Baixa de Parcela
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedToPay, setSelectedToPay] = React.useState<any | null>(null);
  const [payAmount, setPayAmount] = React.useState(0);
  const [payMethod, setPayMethod] = React.useState<PaymentMethod>('pix');
  const [paying, setPaying] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);

  const [todayStr, setTodayStr] = React.useState('');
  const [sevenDaysLaterStr, setSevenDaysLaterStr] = React.useState('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const res = await getInstallmentsAction();
    if (res.success && res.installments) {
      setInstallments(res.installments);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
    const now = new Date();
    setTodayStr(now.toISOString().slice(0, 10));
    const seven = new Date();
    seven.setDate(seven.getDate() + 7);
    setSevenDaysLaterStr(seven.toISOString().slice(0, 10));
  }, [loadData]);

  // Categorização
  const overdueList = installments.filter(
    (i) => i.status === 'pending' && (!todayStr || i.due_date < todayStr)
  );
  const todayList = installments.filter(
    (i) => i.status === 'pending' && i.due_date === todayStr
  );
  const soonList = installments.filter(
    (i) =>
      i.status === 'pending' &&
      todayStr &&
      i.due_date > todayStr &&
      i.due_date <= sevenDaysLaterStr
  );
  const paidList = installments.filter((i) => i.status === 'paid');

  let currentList = overdueList;
  if (activeTab === 'today') currentList = todayList;
  else if (activeTab === 'soon') currentList = soonList;
  else if (activeTab === 'paid') currentList = paidList;
  else if (activeTab === 'all') currentList = installments;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleOpenPayModal(inst: any) {
    setSelectedToPay(inst);
    setPayAmount(Number(inst.amount) || 0);
    setPayMethod('pix');
    setPayError(null);
  }

  async function handleConfirmPayment() {
    if (!selectedToPay) return;
    if (payAmount <= 0) {
      setPayError('Informe um valor pago maior que zero.');
      return;
    }

    setPaying(true);
    setPayError(null);

    const res = await markInstallmentPaidAction({
      installment_id: selectedToPay.id,
      paid_amount: payAmount,
      payment_method: payMethod,
    });

    if (res.success) {
      setSelectedToPay(null);
      loadData();
    } else {
      setPayError(res.error || 'Erro ao registrar pagamento.');
    }
    setPaying(false);
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pt-1">
        <h2 className="text-xl font-bold tracking-tight text-[#2d251e]">
          Gestão de Cobranças
        </h2>
        <p className="text-xs text-[#766a5e]">
          Controle de parcelas e fiado com disparo direto no WhatsApp
        </p>
      </div>

      {/* Tabs / Filtros Rápidos (Horizontal Scroll Touch) */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'overdue'
              ? 'bg-[#b91c1c] text-white shadow-xs'
              : 'bg-white text-[#766a5e] border border-[#dfd5c4]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Vencidos ({overdueList.length})
        </button>

        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'today'
              ? 'bg-[#b45309] text-white shadow-xs'
              : 'bg-white text-[#766a5e] border border-[#dfd5c4]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Vence Hoje ({todayList.length})
        </button>

        <button
          onClick={() => setActiveTab('soon')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'soon'
              ? 'bg-[#977f5a] text-white shadow-xs'
              : 'bg-white text-[#766a5e] border border-[#dfd5c4]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Em Breve ({soonList.length})
        </button>

        <button
          onClick={() => setActiveTab('paid')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTab === 'paid'
              ? 'bg-[#15803d] text-white shadow-xs'
              : 'bg-white text-[#766a5e] border border-[#dfd5c4]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Pagas ({paidList.length})
        </button>
      </div>

      {/* Lista de Parcelas em Cards (Mobile-first) */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#766a5e]">
          Carregando cobranças...
        </div>
      ) : currentList.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#15803d]/10 flex items-center justify-center text-[#15803d]">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-[#2d251e]">
            {activeTab === 'overdue'
              ? 'Nenhuma parcela em atraso! 🎉'
              : activeTab === 'today'
              ? 'Nenhum vencimento para hoje.'
              : activeTab === 'soon'
              ? 'Nenhuma parcela vencendo nos próximos 7 dias.'
              : 'Nenhum registro encontrado.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentList.map((inst) => {
            const isOverdue = inst.status === 'pending' && inst.due_date < todayStr;
            const isToday = inst.status === 'pending' && inst.due_date === todayStr;
            const isPaid = inst.status === 'paid';

            const waUrl = getWhatsAppBillingUrl(inst.clients?.phone || '', {
              clientName: inst.clients?.name || 'Cliente',
              amount: Number(inst.amount),
              dueDate: inst.due_date,
              installmentNumber: inst.installment_number,
              totalInstallments: inst.total_installments,
            });

            return (
              <Card
                key={inst.id}
                className={`p-3.5 bg-white shadow-xs border transition-all ${
                  isOverdue
                    ? 'border-red-300 bg-red-50/20'
                    : isToday
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-[#e4dcd0]'
                }`}
              >
                <div className="flex items-start justify-between pb-2 border-b border-[#ebdcca]/70">
                  <div className="min-w-0 pr-2">
                    <h3 className="text-sm font-bold text-[#2d251e] truncate">
                      {inst.clients?.name || 'Cliente'}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#766a5e] mt-0.5">
                      <Phone className="w-3 h-3 text-[#977f5a]" />
                      <span>{inst.clients?.phone}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-bold text-[#977f5a]">
                      {formatCurrency(Number(inst.amount))}
                    </span>
                    <p className="text-[10px] text-[#766a5e]">
                      Parc. {inst.installment_number} de {inst.total_installments}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#766a5e]">Vencimento: </span>
                    <span
                      className={`font-bold ${
                        isOverdue
                          ? 'text-[#b91c1c]'
                          : isToday
                          ? 'text-[#b45309]'
                          : 'text-[#2d251e]'
                      }`}
                    >
                      {formatDateBR(inst.due_date)}
                    </span>
                  </div>

                  <Badge
                    variant={
                      isPaid
                        ? 'success'
                        : isOverdue
                        ? 'danger'
                        : isToday
                        ? 'warning'
                        : 'default'
                    }
                    className="text-[10px] uppercase font-bold"
                  >
                    {isPaid ? 'Pago' : isOverdue ? 'Atrasado' : isToday ? 'Hoje' : 'A Vencer'}
                  </Badge>
                </div>

                {/* Ações Rápidas Mobile */}
                {!isPaid && (
                  <div className="pt-3 grid grid-cols-2 gap-2">
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#25D366] text-white text-xs font-bold active:scale-95 transition-all shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Cobrar no Whats
                    </a>

                    <Button
                      onClick={() => handleOpenPayModal(inst)}
                      variant="primary"
                      size="sm"
                      className="text-xs font-bold"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Dar Baixa
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Confirmação de Baixa / Pagamento */}
      <Modal
        isOpen={!!selectedToPay}
        onClose={() => setSelectedToPay(null)}
        title="Confirmar Pagamento"
        description="Deseja registrar o recebimento desta parcela?"
      >
        {selectedToPay && (
          <div className="space-y-4">
            {payError && (
              <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
                {payError}
              </div>
            )}

            <div className="p-3 rounded-xl bg-[#faf6f0] border border-[#ebdcca] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#766a5e]">Cliente:</span>
                <span className="font-bold text-[#2d251e]">
                  {selectedToPay.clients?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#766a5e]">Parcela:</span>
                <span className="font-medium text-[#2d251e]">
                  {selectedToPay.installment_number} de {selectedToPay.total_installments}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#766a5e]">Vencimento Original:</span>
                <span className="font-medium text-[#2d251e]">
                  {formatDateBR(selectedToPay.due_date)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#2d251e]">
                Valor Recebido *
              </label>
              <CurrencyInput
                value={payAmount}
                onChange={setPayAmount}
                className="bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#2d251e]">
                Forma de Recebimento
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['pix', 'PIX'],
                    ['dinheiro', 'Dinheiro'],
                    ['cartao_debito', 'Cartão Débito'],
                    ['cartao_credito', 'Cartão Crédito'],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m as PaymentMethod)}
                    className={`py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      payMethod === m
                        ? 'border-[#977f5a] bg-[#977f5a]/15 text-[#836d4b]'
                        : 'border-[#dfd5c4] bg-white text-[#766a5e]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedToPay(null)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                variant="success"
                onClick={handleConfirmPayment}
                isLoading={paying}
                className="text-xs font-bold"
              >
                Confirmar Recebimento
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
