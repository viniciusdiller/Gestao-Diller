'use client';

import * as React from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Plus,
  Trash,
  Calendar,
  Search,
  MessageCircle,
  UserPlus,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  CheckCircle2,
  Clock,
  Coins,
} from 'lucide-react';
import {
  getSalesAction,
  createSaleAction,
  updateSaleAction,
  deleteSaleAction,
} from '../../actions/sales';
import { getClientsAction, createClientAction } from '../../actions/clients';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDateBR } from '@/lib/utils';
import { generateInstallments, InstallmentItem } from '@/lib/services/installment-calculator';
import {
  calculateSettlement,
  calculateSaleItemsTotal,
  roundToCents,
} from '@/lib/services/caderneta-calculator';
import { getWhatsAppReceiptUrl } from '@/lib/services/whatsapp';
import { PaymentMethod } from '@/lib/validations';

interface SaleItemRow {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export default function VendasPage() {
  const { showToast } = useToast();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sales, setSales] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Busca e Filtros
  const [search, setSearch] = React.useState('');
  const [filterMethod, setFilterMethod] = React.useState<string>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(6);

  React.useEffect(() => {
    const handleResize = () => {
      setPageSize(window.innerWidth >= 768 ? 12 : 6);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMethod]);

  // Modal Nova Venda & Caderneta
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [items, setItems] = React.useState<SaleItemRow[]>([
    { id: '1', name: '', quantity: 1, unit_price: 0 },
  ]);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [paidAmountNow, setPaidAmountNow] = React.useState<number>(0);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('pix');
  const [saleDate, setSaleDate] = React.useState('');

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(7), name: '', quantity: 1, unit_price: 0 },
    ]);
  }

  function handleRemoveItem(id: string) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  function handleItemChange(
    id: string,
    field: 'name' | 'quantity' | 'unit_price',
    value: string | number
  ) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return { ...it, [field]: value };
      })
    );
  }

  // Recalcula o total somado dos itens automaticamente
  React.useEffect(() => {
    const hasAnyItem = items.some((it) => it.name.trim().length > 0 || it.unit_price > 0);
    if (hasAnyItem) {
      const calculated = calculateSaleItemsTotal(items);
      setTotalAmount(calculated);
    }
  }, [items]);

  // Cliente selecionado, saldo extra e saldo devedor anterior da caderneta
  const [applyCredit, setApplyCredit] = React.useState(true);
  const selectedClient = clients.find((c) => c.id === clientId);
  const clientPreviousDebt = Number(selectedClient?.outstanding_balance || 0);
  const clientCreditBalance = Number(selectedClient?.credit_balance || 0);
  const settlementPreview = calculateSettlement({
    previousDebt: clientPreviousDebt,
    saleTotal: totalAmount,
    paidAmountNow,
    availableCredit: clientCreditBalance,
    applyCredit,
  });
  const totalDueWithSale = settlementPreview.totalDueWithSale;

  // Cadastro Rápido Inline de Cliente
  const [showQuickClient, setShowQuickClient] = React.useState(false);
  const [quickName, setQuickName] = React.useState('');
  const [quickPhone, setQuickPhone] = React.useState('');
  const [savingQuickClient, setSavingQuickClient] = React.useState(false);
  const [quickClientError, setQuickClientError] = React.useState<string | null>(null);

  // Parcelamento / Fiado
  const [numInstallments, setNumInstallments] = React.useState(2);
  const [intervalType, setIntervalType] = React.useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [firstDueDate, setFirstDueDate] = React.useState('');
  const [generatedInstallments, setGeneratedInstallments] = React.useState<InstallmentItem[]>([]);

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Modais de Edição e Exclusão de Venda
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [saleToEdit, setSaleToEdit] = React.useState<any | null>(null);
  const [editDescription, setEditDescription] = React.useState('');
  const [editTotalAmount, setEditTotalAmount] = React.useState(0);
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<PaymentMethod>('pix');
  const [editSaleDate, setEditSaleDate] = React.useState('');
  const [editClientId, setEditClientId] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [saleToDelete, setSaleToDelete] = React.useState<any | null>(null);
  const [deletingSale, setDeletingSale] = React.useState(false);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [salesRes, clientsRes] = await Promise.all([
        fetch('/api/sales').then((r) => r.json()).catch(() => null),
        fetch('/api/clients').then((r) => r.json()).catch(() => null),
      ]);

      if (salesRes?.success && Array.isArray(salesRes.sales)) {
        setSales(salesRes.sales);
      } else {
        const fbSales = await getSalesAction();
        if (fbSales.success) setSales(fbSales.sales);
      }

      if (clientsRes?.success && Array.isArray(clientsRes.clients)) {
        setClients(clientsRes.clients);
      } else {
        const fbClients = await getClientsAction();
        if (fbClients.success) setClients(fbClients.clients);
      }
    } catch {
      const [fbSales, fbClients] = await Promise.all([
        getSalesAction(),
        getClientsAction(),
      ]);
      if (fbSales.success) setSales(fbSales.sales);
      if (fbClients.success) setClients(fbClients.clients);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
    const d = new Date();
    setSaleDate(d.toISOString().slice(0, 10));
    const due = new Date();
    due.setDate(due.getDate() + 30);
    setFirstDueDate(due.toISOString().slice(0, 10));
  }, [loadData]);

  // Recalcula parcelas ao alterar valores do fiado
  React.useEffect(() => {
    if (paymentMethod === 'fiado') {
      if (totalAmount > 0 && numInstallments > 0 && firstDueDate) {
        try {
          const items = generateInstallments({
            totalAmount,
            numInstallments,
            firstDueDate,
            intervalType,
          });
          setGeneratedInstallments(items);
        } catch {
          setGeneratedInstallments([]);
        }
      } else {
        setGeneratedInstallments([]);
      }
    } else {
      setGeneratedInstallments([]);
    }
  }, [paymentMethod, totalAmount, numInstallments, firstDueDate, intervalType]);

  // Opções para o Combobox
  const clientOptions = React.useMemo(() => {
    return clients.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: c.phone || 'Sem WhatsApp',
    }));
  }, [clients]);

  // Salva cliente rápido inline
  async function handleSaveQuickClient(e: React.FormEvent) {
    e.preventDefault();
    setQuickClientError(null);
    setSavingQuickClient(true);

    const res = await createClientAction({
      name: quickName,
      phone: quickPhone || null,
    });

    if (res.success && res.client) {
      setClients((prev) => [...prev, res.client]);
      setClientId(res.client.id);
      setShowQuickClient(false);
      setQuickName('');
      setQuickPhone('');
      showToast('Cliente cadastrada com sucesso.');
    } else {
      setQuickClientError(res.error || 'Erro ao cadastrar cliente.');
    }
    setSavingQuickClient(false);
  }

  // Criação de Venda
  async function handleCreateSale(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    if (totalAmount <= 0) {
      setErrorMsg('Informe ao menos um item com valor válido para a venda.');
      setSubmitting(false);
      return;
    }

    if (!clientId) {
      setErrorMsg('Selecione uma cliente.');
      setSubmitting(false);
      return;
    }

    const validItems = items.filter((it) => it.name.trim().length > 0);

    const res = await createSaleAction({
      client_id: clientId,
      description: description.trim() || undefined,
      items: validItems.length > 0 ? validItems : undefined,
      total_amount: totalAmount,
      paid_amount_now: paidAmountNow,
      apply_credit: applyCredit,
      payment_method: paymentMethod,
      sale_date: saleDate ? new Date(saleDate + 'T12:00:00Z').toISOString() : undefined,
      installments:
        paymentMethod === 'fiado' && generatedInstallments.length > 1
          ? generatedInstallments
          : undefined,
    });

    if (res.success) {
      setIsModalOpen(false);
      setClientId('');
      setDescription('');
      setItems([{ id: '1', name: '', quantity: 1, unit_price: 0 }]);
      setPaidAmountNow(0);
      setTotalAmount(0);
      setPaymentMethod('pix');
      setApplyCredit(true);
      setGeneratedInstallments([]);
      showToast('Venda registrada com sucesso! 💎');
      loadData();
    } else {
      setErrorMsg(res.error || 'Erro ao registrar venda.');
    }
    setSubmitting(false);
  }

  // Abre Modal de Edição de Venda
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleOpenEditModal(sale: any) {
    setSaleToEdit(sale);
    setEditDescription(sale.description);
    setEditTotalAmount(Number(sale.total_amount));
    setEditPaymentMethod(sale.payment_method);
    setEditClientId(sale.clients?.id || '');
    setEditSaleDate(sale.sale_date ? sale.sale_date.slice(0, 10) : '');
    setEditError(null);
  }

  // Submete Edição de Venda
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!saleToEdit) return;
    setSavingEdit(true);
    setEditError(null);

    const res = await updateSaleAction({
      id: saleToEdit.id,
      client_id: editClientId || undefined,
      description: editDescription,
      total_amount: editTotalAmount,
      payment_method: editPaymentMethod,
      sale_date: editSaleDate ? new Date(editSaleDate + 'T12:00:00Z').toISOString() : undefined,
    });

    if (res.success) {
      setSaleToEdit(null);
      showToast('Venda atualizada com sucesso.');
      loadData();
    } else {
      setEditError(res.error || 'Erro ao atualizar venda.');
    }
    setSavingEdit(false);
  }

  // Executa Exclusão de Venda
  async function handleConfirmDelete() {
    if (!saleToDelete) return;
    setDeletingSale(true);

    const res = await deleteSaleAction(saleToDelete.id);
    if (res.success) {
      setSaleToDelete(null);
      showToast('Venda excluída com sucesso.');
      loadData();
    } else {
      showToast(res.error || 'Erro ao excluir venda.', 'error');
    }
    setDeletingSale(false);
  }

  const paymentLabels: Record<string, string> = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    cartao_debito: 'Débito',
    cartao_credito: 'Crédito',
    fiado: 'Fiado / A Prazo',
  };

  // Filtragem da lista de vendas
  const filteredSales = sales.filter((sale) => {
    const q = search.toLowerCase();
    const matchesSearch =
      sale.description?.toLowerCase().includes(q) ||
      sale.clients?.name?.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (filterMethod === 'all') return true;
    if (filterMethod === 'fiado_pending') {
      return sale.payment_method === 'fiado' && sale.status === 'pending';
    }
    return sale.payment_method === filterMethod;
  });

  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#2d251e]">
            Vendas
          </h2>
          <p className="text-xs text-[#766a5e]">
            {sales.length} {sales.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="gap-1.5 shadow-xs"
        >
          <PlusCircle className="w-4 h-4" /> Nova Venda
        </Button>
      </div>

      {/* Barra de Busca Touch */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#766a5e]" />
        <Input
          type="text"
          placeholder="Buscar por descrição ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white border-[#e4dcd0]"
        />
      </div>

      {/* Chips de Filtro Rápido */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          ['all', 'Todas'],
          ['fiado_pending', 'Fiado Pendente'],
          ['pix', 'PIX'],
          ['cartao_credito', 'Crédito'],
          ['cartao_debito', 'Débito'],
          ['dinheiro', 'Dinheiro'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterMethod(val)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 active:scale-95 ${
              filterMethod === val
                ? 'bg-[#977f5a] text-white shadow-xs'
                : 'bg-white text-[#766a5e] border border-[#dfd5c4]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista de Cards de Vendas */}
      {loading ? (
        <LoadingState message="Carregando vendas..." />
      ) : filteredSales.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#977f5a]/10 flex items-center justify-center text-[#977f5a]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-[#2d251e]">
            {search || filterMethod !== 'all'
              ? 'Nenhuma venda corresponde aos filtros.'
              : 'Nenhuma venda registrada ainda.'}
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Registrar Primeira Venda
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {paginatedSales.map((sale, idx) => {
              const clientPhone = sale.clients?.phone || '';
              const receiptUrl = clientPhone
                ? getWhatsAppReceiptUrl(clientPhone, {
                    clientName: sale.clients?.name || 'Cliente',
                    description: sale.description,
                    amount: Number(sale.total_amount),
                    paymentMethod: sale.payment_method,
                  })
                : '';

              return (
                <Card
                  key={sale.id}
                  style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
                  className="p-4 bg-white border-[#e4dcd0] shadow-xs hover:border-[#977f5a] hover:shadow-md hover:-translate-y-0.5 touch-card animate-slide-up transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between pb-2 border-b border-[#ebdcca]/70">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-[#2d251e] truncate">
                          {sale.clients?.name || 'Cliente'}
                        </span>
                        <Badge
                          variant={
                            sale.payment_method === 'fiado' && sale.status === 'pending'
                              ? 'warning'
                              : 'success'
                          }
                          className="text-[10px] px-1.5 py-0 uppercase font-bold"
                        >
                          {sale.payment_method === 'fiado' && sale.status === 'pending'
                            ? 'Fiado (Pendente)'
                            : paymentLabels[sale.payment_method] || sale.payment_method}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#52463b] mt-1 font-medium leading-relaxed">
                        {sale.description}
                      </p>
                      <p className="text-[10px] text-[#766a5e] mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#977f5a]" />
                        {formatDateBR(sale.sale_date)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-bold text-[#977f5a]">
                        {formatCurrency(Number(sale.total_amount))}
                      </span>
                      {Number(sale.remaining_amount || 0) > 0 ? (
                        <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                          Falta: {formatCurrency(Number(sale.remaining_amount))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                          Quitado
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lista de Peças Vendidas (se houver sale_items) */}
                  {sale.sale_items && sale.sale_items.length > 0 && (
                    <div className="py-2 flex flex-wrap gap-1 border-b border-[#f0e9df]">
                      {sale.sale_items.map((it: any) => (
                        <span
                          key={it.id}
                          className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-[#faf6f0] text-[#766a5e] border border-[#ebdcca]"
                        >
                          <Package className="w-2.5 h-2.5 mr-1 text-[#977f5a]" />
                          {it.quantity}x {it.name} ({formatCurrency(Number(it.unit_price))})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Ações do Card de Venda: WhatsApp, Editar e Excluir */}
                  <div className="pt-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {receiptUrl ? (
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/15 text-[#128C7E] text-xs font-semibold hover:bg-[#25D366] hover:text-white transition-all active:scale-95"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Comprovante
                        </a>
                      ) : (
                        <span className="text-[10px] text-[#766a5e] bg-neutral-100 px-2 py-1 rounded-md">
                          Sem WhatsApp
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(sale)}
                        className="p-2 rounded-lg text-[#766a5e] hover:text-[#977f5a] hover:bg-[#f5efe6] transition-colors"
                        title="Editar venda"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaleToDelete(sale)}
                        className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        title="Excluir venda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredSales.length}
            pageSize={pageSize}
            itemName="vendas"
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Modal Nova Venda com Combobox Searchable */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setShowQuickClient(false);
        }}
        title="Registrar Nova Venda"
        description="Preencha os detalhes da peça vendida"
      >
        <form onSubmit={handleCreateSale} className="space-y-3.5">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Selecionar Cliente com Combobox Digitável e Filtro em Tempo Real */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#2d251e]">
                Cliente *
              </label>
              <button
                type="button"
                onClick={() => setShowQuickClient(!showQuickClient)}
                className="text-[11px] font-bold text-[#977f5a] hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                {showQuickClient ? 'Selecionar da Lista' : '+ Nova Cliente'}
              </button>
            </div>

            {showQuickClient ? (
              <div className="p-3 rounded-xl bg-[#faf6f0] border border-[#ebdcca] space-y-2.5">
                <p className="text-[11px] font-bold text-[#977f5a] flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Cadastro Rápido de Cliente
                </p>

                {quickClientError && (
                  <p className="text-[10px] text-red-600">{quickClientError}</p>
                )}

                <Input
                  placeholder="Nome completo da cliente *"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="h-10 text-xs bg-white"
                />

                <PhoneInput
                  placeholder="WhatsApp com DDD (opcional)"
                  value={quickPhone}
                  onChange={setQuickPhone}
                  className="h-10 text-xs bg-white"
                />

                <Button
                  type="button"
                  onClick={handleSaveQuickClient}
                  size="sm"
                  isLoading={savingQuickClient}
                  className="w-full text-xs h-9 font-bold"
                >
                  Salvar e Selecionar Cliente
                </Button>
              </div>
            ) : (
              <Combobox
                options={clientOptions}
                value={clientId}
                onChange={setClientId}
                placeholder="Selecione ou digite o nome da cliente..."
                searchPlaceholder="Buscar por nome ou telefone..."
                emptyText="Nenhuma cliente encontrada."
                onAddNew={(name) => {
                  setQuickName(name);
                  setShowQuickClient(true);
                }}
              />
            )}
          </div>

          {/* Itens da Venda (Tabela Relacional) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#2d251e] flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#977f5a]" />
                Peças da Venda *
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[11px] font-bold text-[#977f5a] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar Peça
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const subtotal = roundToCents((Number(item.quantity) || 1) * (Number(item.unit_price) || 0));

                return (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-[#faf6f0] border border-[#ebdcca] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        placeholder={`Nome da peça ${idx + 1} (ex: 1 anel dourado)`}
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                        className="h-9 text-xs bg-white font-medium"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Remover peça"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center text-xs">
                      <div>
                        <label className="text-[10px] text-[#766a5e] block font-medium mb-0.5">
                          Qtd
                        </label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(item.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                          }
                          className="h-8 text-xs bg-white font-semibold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#766a5e] block font-medium mb-0.5">
                          Valor Unit.
                        </label>
                        <CurrencyInput
                          value={item.unit_price}
                          onChange={(val) => handleItemChange(item.id, 'unit_price', val)}
                          className="h-8 text-xs bg-white font-semibold"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#766a5e] block font-medium mb-0.5">
                          Subtotal
                        </span>
                        <span className="text-xs font-bold text-[#977f5a]">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-[#dfd5c4] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#52463b]">Total Deste Pedido:</span>
              <span className="text-sm font-extrabold text-[#977f5a]">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Painel da Conta Corrente / Caderneta do Cliente */}
          {clientId && (
            <div className="p-3 rounded-2xl bg-[#faf6f0] border border-[#ebdcca] space-y-2">
              {clientCreditBalance > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-emerald-950">
                        Cliente possui {formatCurrency(clientCreditBalance)} de Saldo Extra
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        {applyCredit
                          ? `Abatendo ${formatCurrency(settlementPreview.creditApplied)} deste pedido.`
                          : 'Saldo guardado para uso futuro.'}
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyCredit}
                      onChange={(e) => setApplyCredit(e.target.checked)}
                      className="h-4 w-4 rounded border-emerald-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-emerald-900">Usar</span>
                  </label>
                </div>
              )}

              {clientPreviousDebt > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#766a5e] font-medium">Dívida anterior da cliente:</span>
                  <span className="font-bold text-[#2d251e]">
                    {formatCurrency(clientPreviousDebt)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#766a5e] font-medium">Novo pedido atual:</span>
                <span className="font-bold text-[#2d251e]">
                  +{formatCurrency(totalAmount)}
                </span>
              </div>

              {applyCredit && settlementPreview.creditApplied > 0 && (
                <div className="flex items-center justify-between text-xs text-emerald-700">
                  <span className="font-medium">Saldo extra aplicado:</span>
                  <span className="font-bold">
                    -{formatCurrency(settlementPreview.creditApplied)}
                  </span>
                </div>
              )}

              <div className="pt-1.5 border-t border-[#ebdcca] flex items-center justify-between text-xs">
                <span className="font-bold text-[#2d251e]">Total acumulado em aberto:</span>
                <span className="text-sm font-black text-amber-900">
                  {formatCurrency(totalDueWithSale)}
                </span>
              </div>
            </div>
          )}

          {/* Fechamento: Quanto pagou no ato */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-[#2d251e] flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#977f5a]" />
              Quanto a cliente pagou na hora? *
            </label>
            <CurrencyInput
              value={paidAmountNow}
              onChange={setPaidAmountNow}
              className="bg-white font-extrabold text-base"
            />

            {/* Atalhos Rápidos de 1 Clique */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaidAmountNow(totalDueWithSale)}
                className="py-1.5 px-2 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors truncate"
                title={`Pagar R$ ${totalDueWithSale} e quitar tudo`}
              >
                Já pagou tudo
              </button>
              <button
                type="button"
                onClick={() => setPaidAmountNow(settlementPreview.effectiveSaleTotal)}
                className="py-1.5 px-2 rounded-lg text-[10px] font-bold bg-[#faf6f0] text-[#977f5a] border border-[#ebdcca] hover:bg-[#f2e7d8] transition-colors truncate"
                title={`Pagar apenas os R$ ${settlementPreview.effectiveSaleTotal} deste pedido`}
              >
                Apenas o pedido
              </button>
              <button
                type="button"
                onClick={() => setPaidAmountNow(0)}
                className="py-1.5 px-2 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors truncate"
              >
                Fiado total (R$ 0)
              </button>
            </div>

            {/* Indicador em Tempo Real do Saldo Devedor Restante ou Saldo Extra */}
            <div className="pt-1">
              {settlementPreview.surplusCreditGenerated > 0 ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">
                      Conta quitada e +{formatCurrency(settlementPreview.surplusCreditGenerated)} de Saldo Extra!
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Saldo extra total acumulado da cliente:{' '}
                      <strong>{formatCurrency(settlementPreview.finalCreditBalance)}</strong>
                    </p>
                  </div>
                </div>
              ) : settlementPreview.finalOutstandingBalance === 0 ? (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">Conta 100% quitada!</p>
                    <p className="text-[11px] text-emerald-700">
                      {settlementPreview.finalCreditBalance > 0
                        ? `A cliente mantém ${formatCurrency(settlementPreview.finalCreditBalance)} de saldo extra.`
                        : 'A cliente não ficará com nenhum débito em aberto.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-bold">
                      Saldo restante a pagar:{' '}
                      <strong>{formatCurrency(settlementPreview.finalOutstandingBalance)}</strong>
                    </p>
                    <p className="text-[11px] text-amber-700">
                      O saldo em aberto permanecerá na Caderneta / Cobranças.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Meio de Pagamento do Valor Pago no Ato */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Forma de Pagamento {paidAmountNow > 0 ? '(do valor pago)' : ''}
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="flex h-11 w-full rounded-xl border border-[#dfd5c4] bg-white px-3.5 py-2 text-xs font-medium text-[#2d251e] focus:border-[#977f5a] focus:outline-none"
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="fiado">Fiado</option>
            </select>
          </div>

          {/* Data da Venda */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Data da Venda
            </label>
            <DatePicker
              value={saleDate}
              onChange={setSaleDate}
              placeholder="Selecione a data da venda..."
            />
            {saleDate && new Date(saleDate + 'T23:59:59') < new Date() && (
              <p className="text-[11px] text-amber-700 font-medium pt-0.5">
                ⚡ Data retroativa: o saldo em aberto constará imediatamente na régua de cobrança.
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full text-base font-semibold shadow-md"
              size="lg"
              isLoading={submitting}
            >
              Registrar Venda
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Venda */}
      <Modal
        isOpen={!!saleToEdit}
        onClose={() => setSaleToEdit(null)}
        title="Editar Venda"
        description="Atualize os dados deste pedido registrado"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5">
          {editError && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
              {editError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Cliente
            </label>
            <Combobox
              options={clientOptions}
              value={editClientId}
              onChange={setEditClientId}
              placeholder="Selecione a cliente..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Descrição das Peças *
            </label>
            <Input
              type="text"
              required
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Valor Total *
            </label>
            <CurrencyInput
              value={editTotalAmount}
              onChange={setEditTotalAmount}
              className="bg-white font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Data da Venda
            </label>
            <DatePicker
              value={editSaleDate}
              onChange={setEditSaleDate}
              placeholder="Selecione a data da venda..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Forma de Pagamento *
            </label>
            <select
              value={editPaymentMethod}
              onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
              className="flex h-12 w-full rounded-xl border border-[#dfd5c4] bg-white px-3.5 py-2 text-sm text-[#2d251e] focus:border-[#977f5a] focus:outline-none"
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="fiado">Fiado / Parcelado</option>
            </select>
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaleToEdit(null)}
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

      {/* Modal Confirmação de Exclusão de Venda */}
      <Modal
        isOpen={!!saleToDelete}
        onClose={() => setSaleToDelete(null)}
        title="Excluir Venda"
        description="Esta ação não pode ser desfeita"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 space-y-1">
              <p className="font-bold">
                Tem certeza que deseja excluir esta venda?
              </p>
              <p>
                Cliente: <strong className="font-semibold">{saleToDelete?.clients?.name}</strong>
              </p>
              <p>
                Valor: <strong className="font-semibold">{formatCurrency(Number(saleToDelete?.total_amount || 0))}</strong>
              </p>
              <p className="text-[11px] text-red-600/90 pt-1">
                Todas as parcelas e cobranças vinculadas a esta venda também serão excluídas do sistema.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSaleToDelete(null)}
              className="w-1/2"
              disabled={deletingSale}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              className="w-1/2 font-bold"
              isLoading={deletingSale}
            >
              Sim, Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
