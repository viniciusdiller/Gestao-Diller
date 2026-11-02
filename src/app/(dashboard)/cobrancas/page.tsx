'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  MessageCircle,
  Phone,
  Pencil,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  getInstallmentsAction,
  markInstallmentPaidAction,
  revertInstallmentPaymentAction,
  updateInstallmentAction,
  deleteInstallmentAction,
} from '../../actions/installments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { DatePicker } from '@/components/ui/date-picker';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDateBR } from '@/lib/utils';
import { getWhatsAppBillingUrl } from '@/lib/services/whatsapp';
import { PaymentMethod } from '@/lib/validations';

type TabType = 'overdue' | 'today' | 'soon' | 'paid' | 'all';

export default function CobrancasPage() {
  const { showToast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installments, setInstallments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabType>('overdue');
  const [currentPage, setCurrentPage] = React.useState(1);

  const PAGE_SIZE = 12;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Modal Baixa de Parcela
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedToPay, setSelectedToPay] = React.useState<any | null>(null);
  const [payAmount, setPayAmount] = React.useState(0);
  const [payMethod, setPayMethod] = React.useState<PaymentMethod>('pix');
  const [payNotes, setPayNotes] = React.useState('');
  const [paying, setPaying] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);

  // Modal Edição de Parcela
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installmentToEdit, setInstallmentToEdit] = React.useState<any | null>(null);
  const [editAmount, setEditAmount] = React.useState(0);
  const [editDueDate, setEditDueDate] = React.useState('');
  const [editNotes, setEditNotes] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Modal Exclusão de Parcela
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [installmentToDelete, setInstallmentToDelete] = React.useState<any | null>(null);
  const [deletingInstallment, setDeletingInstallment] = React.useState(false);

  // Reversão de Parcela
  const [revertingId, setRevertingId] = React.useState<string | null>(null);

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

  const totalPages = Math.ceil(currentList.length / PAGE_SIZE) || 1;
  const paginatedInstallments = currentList.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleOpenPayModal(inst: any) {
    setSelectedToPay(inst);
    setPayAmount(Number(inst.amount) || 0);
    setPayMethod('pix');
    setPayNotes('');
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
      notes: payNotes || undefined,
    });

    if (res.success) {
      setSelectedToPay(null);
      showToast('Pagamento registrado com sucesso! 💰');
      loadData();
    } else {
      setPayError(res.error || 'Erro ao registrar pagamento.');
    }
    setPaying(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleOpenEditModal(inst: any) {
    setInstallmentToEdit(inst);
    setEditAmount(Number(inst.amount) || 0);
    setEditDueDate(inst.due_date || '');
    setEditNotes(inst.notes || '');
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!installmentToEdit) return;
    setSavingEdit(true);
    setEditError(null);

    const res = await updateInstallmentAction({
      id: installmentToEdit.id,
      amount: editAmount,
      due_date: editDueDate,
      notes: editNotes || null,
    });

    if (res.success) {
      setInstallmentToEdit(null);
      showToast('Parcela atualizada com sucesso! ✨');
      loadData();
    } else {
      setEditError(res.error || 'Erro ao atualizar parcela.');
    }
    setSavingEdit(false);
  }

  async function handleConfirmDelete() {
    if (!installmentToDelete) return;
    setDeletingInstallment(true);

    const res = await deleteInstallmentAction(installmentToDelete.id);
    if (res.success) {
      setInstallmentToDelete(null);
      showToast('Parcela excluída com sucesso.');
      loadData();
    } else {
      showToast(res.error || 'Erro ao excluir parcela.', 'error');
    }
    setDeletingInstallment(false);
  }

  async function handleRevertPayment(instId: string) {
    setRevertingId(instId);
    const res = await revertInstallmentPaymentAction(instId);
    if (res.success) {
      showToast('Baixa revertida para pendente com sucesso.');
      loadData();
    } else {
      showToast(res.error || 'Erro ao reverter pagamento.', 'error');
    }
    setRevertingId(null);
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
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all shrink-0 ${
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all shrink-0 ${
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all shrink-0 ${
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all shrink-0 ${
            activeTab === 'paid'
              ? 'bg-[#15803d] text-white shadow-xs'
              : 'bg-white text-[#766a5e] border border-[#dfd5c4]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Pagas ({paidList.length})
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all shrink-0 ${
            activeTab === 'all'
              ? 'bg-[#52463b] text-white shadow-xs'
              : 'bg-white text-[#766a5e] border border-[#dfd5c4]'
          }`}
        >
          Todas ({installments.length})
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {paginatedInstallments.map((inst) => {
            const isOverdue = inst.status === 'pending' && inst.due_date < todayStr;
            const isToday = inst.status === 'pending' && inst.due_date === todayStr;
            const isPaid = inst.status === 'paid';

            const clientPhone = inst.clients?.phone;
            const waUrl = clientPhone
              ? getWhatsAppBillingUrl(clientPhone, {
                  clientName: inst.clients?.name || 'Cliente',
                  amount: Number(inst.amount),
                  dueDate: inst.due_date,
                  installmentNumber: inst.installment_number,
                  totalInstallments: inst.total_installments,
                })
              : '';

            return (
              <Card
                key={inst.id}
                className={`p-4 bg-white shadow-xs border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between ${
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
                      <span>{inst.clients?.phone || 'Sem WhatsApp cadastrado'}</span>
                    </div>
                    {inst.sales?.description && (
                      <p className="text-[11px] text-[#52463b] font-medium truncate mt-1">
                        {inst.sales.description}
                      </p>
                    )}
                    {inst.notes && (
                      <p className="text-[10px] text-[#8e8174] italic truncate mt-0.5">
                        Nota: {inst.notes}
                      </p>
                    )}
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

                  <div className="flex items-center gap-1.5">
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

                    {/* Botões rápidos de Editar / Excluir Parcela */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(inst)}
                      className="p-1 rounded-md text-[#766a5e] hover:text-[#977f5a] hover:bg-[#f5efe6] transition-colors"
                      title="Editar parcela"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallmentToDelete(inst)}
                      className="p-1 rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Excluir parcela"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Ações Rápidas Mobile: Cobrança ou Baixa */}
                {!isPaid ? (
                  <div className="pt-3 grid grid-cols-2 gap-2">
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#25D366] text-white text-xs font-bold active:scale-95 transition-all shadow-xs"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Cobrar no Whats
                      </a>
                    ) : (
                      <div className="flex items-center justify-center py-2.5 px-3 rounded-xl bg-neutral-100 text-[#766a5e] text-xs font-semibold">
                        Sem WhatsApp
                      </div>
                    )}

                    <Button
                      onClick={() => handleOpenPayModal(inst)}
                      variant="primary"
                      size="sm"
                      className="text-xs font-bold shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Dar Baixa
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-neutral-100 mt-2">
                    <span className="text-[#15803d] font-semibold text-[11px]">
                      Pago {inst.payment_method ? `(${inst.payment_method === 'cartao_credito' ? 'Crédito' : inst.payment_method === 'cartao_debito' ? 'Débito' : inst.payment_method.toUpperCase()})` : ''} em{' '}
                      {inst.paid_at ? formatDateBR(inst.paid_at) : 'Data registrada'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRevertPayment(inst.id)}
                      disabled={revertingId === inst.id}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reverter Baixa
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={currentList.length}
          pageSize={PAGE_SIZE}
          itemName="parcelas"
          onPageChange={(page) => setCurrentPage(page)}
        />
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
                className="bg-white font-bold"
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#2d251e]">
                Observações de Baixa (opcional)
              </label>
              <Input
                placeholder="Ex: Pago com PIX comprovante no whats"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="bg-white text-xs"
              />
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

      {/* Modal Editar Parcela */}
      <Modal
        isOpen={!!installmentToEdit}
        onClose={() => setInstallmentToEdit(null)}
        title="Editar Parcela"
        description="Ajuste o valor ou data desta parcela"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5">
          {editError && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
              {editError}
            </div>
          )}

          <div className="p-2.5 rounded-xl bg-[#faf6f0] border border-[#ebdcca] text-xs">
            <span className="text-[#766a5e]">Cliente: </span>
            <strong className="text-[#2d251e] font-bold">
              {installmentToEdit?.clients?.name}
            </strong>{' '}
            (Parc. {installmentToEdit?.installment_number}/{installmentToEdit?.total_installments})
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Valor da Parcela *
            </label>
            <CurrencyInput
              value={editAmount}
              onChange={setEditAmount}
              className="bg-white font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Data de Vencimento *
            </label>
            <DatePicker
              value={editDueDate}
              onChange={setEditDueDate}
              required
              placeholder="Selecione o vencimento..."
              showPresets={true}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Anotações da Parcela (opcional)
            </label>
            <Textarea
              placeholder="Ex: Vencimento prorrogado a pedido da cliente..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInstallmentToEdit(null)}
              className="w-1/2"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="w-1/2 font-semibold shadow-md"
              isLoading={savingEdit}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmação de Exclusão de Parcela */}
      <Modal
        isOpen={!!installmentToDelete}
        onClose={() => setInstallmentToDelete(null)}
        title="Excluir Parcela"
        description="Esta ação removerá esta cobrança do sistema"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 space-y-1">
              <p className="font-bold">
                Tem certeza que deseja excluir esta parcela?
              </p>
              <p>
                Cliente: <strong className="font-semibold">{installmentToDelete?.clients?.name}</strong>
              </p>
              <p>
                Valor: <strong className="font-semibold">{formatCurrency(Number(installmentToDelete?.amount || 0))}</strong>
              </p>
              <p>
                Vencimento: <strong className="font-semibold">{installmentToDelete?.due_date ? formatDateBR(installmentToDelete.due_date) : ''}</strong>
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInstallmentToDelete(null)}
              className="w-1/2"
              disabled={deletingInstallment}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              className="w-1/2 font-bold"
              isLoading={deletingInstallment}
            >
              Sim, Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
