'use client';

import * as React from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Calendar,
  Sparkles,
  Search,
  MessageCircle,
  UserPlus,
  Pencil,
  Trash2,
  AlertTriangle,
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
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDateBR } from '@/lib/utils';
import { generateInstallments, InstallmentItem } from '@/lib/services/installment-calculator';
import { getWhatsAppReceiptUrl } from '@/lib/services/whatsapp';
import { PaymentMethod } from '@/lib/validations';

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

  const PAGE_SIZE = 12;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMethod]);

  // Modal Nova Venda
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('pix');
  const [saleDate, setSaleDate] = React.useState('');

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
      showToast('Cliente cadastrada com sucesso! ✨');
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
      setErrorMsg('Informe um valor de venda maior que zero.');
      setSubmitting(false);
      return;
    }

    if (!clientId) {
      setErrorMsg('Selecione uma cliente.');
      setSubmitting(false);
      return;
    }

    const res = await createSaleAction({
      client_id: clientId,
      description,
      total_amount: totalAmount,
      payment_method: paymentMethod,
      sale_date: saleDate ? new Date(saleDate + 'T12:00:00Z').toISOString() : undefined,
      installments:
        paymentMethod === 'fiado' && generatedInstallments.length > 0
          ? generatedInstallments
          : undefined,
    });

    if (res.success) {
      setIsModalOpen(false);
      setClientId('');
      setDescription('');
      setTotalAmount(0);
      setPaymentMethod('pix');
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
      showToast('Venda atualizada com sucesso! ✨');
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

  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE) || 1;
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
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
        <div className="py-12 text-center text-xs text-[#766a5e]">
          Carregando vendas...
        </div>
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
            {paginatedSales.map((sale) => {
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
                  className="p-4 bg-white border-[#e4dcd0] shadow-xs hover:border-[#977f5a] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
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
                    </div>
                  </div>

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
            pageSize={PAGE_SIZE}
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
                <p className="text-[11px] font-bold text-[#977f5a] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Cadastro Rápido de Cliente
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

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Descrição das Peças *
            </label>
            <Input
              type="text"
              required
              placeholder="Ex: Conjunto ouro 18k e brinco ponto de luz"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Valor Total com Máscara Bancária R$ */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Valor Total *
            </label>
            <CurrencyInput
              value={totalAmount}
              onChange={setTotalAmount}
              className="bg-white font-bold"
            />
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
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Forma de Pagamento *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="flex h-12 w-full rounded-xl border border-[#dfd5c4] bg-white px-3.5 py-2 text-sm text-[#2d251e] focus:border-[#977f5a] focus:outline-none"
            >
              <option value="pix">PIX</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="fiado">Fiado / Parcelado</option>
            </select>
          </div>

          {/* Seção Condicional: Fiado & Parcelamento */}
          {paymentMethod === 'fiado' && (
            <div className="p-3.5 rounded-2xl bg-[#f5efe6] border border-[#e4dcd0] space-y-3">
              <h4 className="text-xs font-bold text-[#2d251e] flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#977f5a]" /> Detalhes do Parcelamento
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#766a5e]">
                    Qtd. de Parcelas
                  </label>
                  <select
                    value={numInstallments}
                    onChange={(e) => setNumInstallments(Number(e.target.value))}
                    className="flex h-10 w-full rounded-xl border border-[#dfd5c4] bg-white px-2.5 text-xs text-[#2d251e] focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}x {n === 1 ? '(Parcela única)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[#766a5e]">
                    Periodicidade
                  </label>
                  <select
                    value={intervalType}
                    onChange={(e) =>
                      setIntervalType(e.target.value as 'monthly' | 'biweekly' | 'weekly')
                    }
                    className="flex h-10 w-full rounded-xl border border-[#dfd5c4] bg-white px-2.5 text-xs text-[#2d251e] focus:outline-none"
                  >
                    <option value="monthly">Mensal (30 dias)</option>
                    <option value="biweekly">Quinzenal (15 dias)</option>
                    <option value="weekly">Semanal (7 dias)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-[#766a5e]">
                  Vencimento da 1ª Parcela
                </label>
                <DatePicker
                  value={firstDueDate}
                  onChange={setFirstDueDate}
                  placeholder="Data do 1º vencimento..."
                  showPresets={true}
                />
              </div>

              {/* Lista Prévia das Parcelas Calculadas */}
              {generatedInstallments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-[#766a5e] uppercase">
                    Cronograma de Vencimentos:
                  </p>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {generatedInstallments.map((inst) => (
                      <div
                        key={inst.installment_number}
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#ebdcca] text-xs"
                      >
                        <span className="font-semibold text-[#2d251e]">
                          Parcela {inst.installment_number}/{inst.total_installments}
                        </span>
                        <span className="text-[#766a5e]">
                          {formatDateBR(inst.due_date)}
                        </span>
                        <span className="font-bold text-[#977f5a]">
                          {formatCurrency(inst.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
