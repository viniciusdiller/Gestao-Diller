'use client';

import * as React from 'react';
import {
  Package,
  PlusCircle,
  Pencil,
  Trash2,
  Calendar,
  Building2,
  Search,
  Sparkles,
  TrendingDown,
  ShoppingBag,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/components/ui/toast';
import {
  getPurchasesAction,
  createPurchaseAction,
  updatePurchaseAction,
  deletePurchaseAction,
  getPurchasesMetricsAction,
  getDistinctFactoriesAction,
  PurchaseRow,
} from '@/app/actions/purchases';
import { formatCurrency, formatDateBR, getTodayDateString } from '@/lib/utils';

const DEFAULT_PARTNER_FACTORIES = [
  'Carol Freitas Acessórios',
  'Amorelli',
  'Zane',
  'Rujah',
  'Elos Acessórios',
  'Ilumi',
  'AR Folheados',
  'Miss A',
  'JMN Folheados',
  'Veraneio Semijoias',
];

export default function ComprasPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [purchases, setPurchases] = React.useState<PurchaseRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Sugestões de fábricas
  const [knownFactories, setKnownFactories] = React.useState<string[]>(DEFAULT_PARTNER_FACTORIES);

  // Métricas do topo
  const [metrics, setMetrics] = React.useState<{
    monthTotal: number;
    monthCount: number;
    allTimeTotal: number;
    topFactory: { name: string; total: number; count: number } | null;
  }>({
    monthTotal: 0,
    monthCount: 0,
    allTimeTotal: 0,
    topFactory: null,
  });

  // Modal Novo / Edição
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPurchase, setEditingPurchase] = React.useState<PurchaseRow | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Campos do formulário
  const [factoryName, setFactoryName] = React.useState('');
  const [totalAmount, setTotalAmount] = React.useState<number>(0);
  const [purchaseDate, setPurchaseDate] = React.useState(getTodayDateString());
  const [notes, setNotes] = React.useState('');

  // Modal Exclusão
  const [purchaseToDelete, setPurchaseToDelete] = React.useState<PurchaseRow | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Carregar dados
  const loadData = React.useCallback(async (targetPage = 1, search = searchTerm) => {
    setLoading(true);
    try {
      const [listRes, metricsRes, factoriesRes] = await Promise.all([
        getPurchasesAction({ page: targetPage, limit: 12, search }),
        getPurchasesMetricsAction(),
        getDistinctFactoriesAction(),
      ]);

      if (listRes.success) {
        setPurchases(listRes.purchases || []);
        setPage(listRes.page ?? 1);
        setTotalPages(listRes.totalPages ?? 1);
        setTotalRecords(listRes.total ?? 0);
      } else {
        showToast(listRes.error || 'Erro ao carregar compras.', 'error');
      }

      if (metricsRes.success) {
        setMetrics({
          monthTotal: metricsRes.monthTotal,
          monthCount: metricsRes.monthCount,
          allTimeTotal: metricsRes.allTimeTotal,
          topFactory: metricsRes.topFactory,
        });
      }

      if (factoriesRes.success) {
        const merged = Array.from(
          new Set([...factoriesRes.factories, ...DEFAULT_PARTNER_FACTORIES])
        );
        setKnownFactories(merged);
      }
    } catch {
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showToast]);

  React.useEffect(() => {
    loadData(1);
  }, [loadData]);

  // Busca com debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1, searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, loadData]);

  function handleOpenNewModal() {
    setEditingPurchase(null);
    setFactoryName('');
    setTotalAmount(0);
    setPurchaseDate(getTodayDateString());
    setNotes('');
    setIsModalOpen(true);
  }

  function handleOpenEditModal(p: PurchaseRow) {
    setEditingPurchase(p);
    setFactoryName(p.factory_name);
    setTotalAmount(Number(p.total_amount));
    setPurchaseDate(p.purchase_date);
    setNotes(p.notes || '');
    setIsModalOpen(true);
  }

  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault();

    if (!factoryName.trim()) {
      showToast('Informe o nome da fábrica ou fornecedor.', 'error');
      return;
    }

    if (totalAmount <= 0) {
      showToast('O valor total da compra deve ser maior que zero.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPurchase) {
        const res = await updatePurchaseAction({
          id: editingPurchase.id,
          factory_name: factoryName.trim(),
          total_amount: totalAmount,
          purchase_date: purchaseDate,
          notes: notes.trim() || null,
        });

        if (res.success) {
          showToast('Compra atualizada com sucesso!', 'success');
          setIsModalOpen(false);
          loadData(page);
        } else {
          showToast(res.error || 'Erro ao atualizar compra.', 'error');
        }
      } else {
        const res = await createPurchaseAction({
          factory_name: factoryName.trim(),
          total_amount: totalAmount,
          purchase_date: purchaseDate,
          notes: notes.trim() || null,
        });

        if (res.success) {
          showToast('Compra de fábrica registrada com sucesso!', 'success');
          setIsModalOpen(false);
          loadData(1);
        } else {
          showToast(res.error || 'Erro ao registrar compra.', 'error');
        }
      }
    } catch {
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmDelete(p: PurchaseRow) {
    setPurchaseToDelete(p);
    setIsDeleteModalOpen(true);
  }

  async function handleDeletePurchase() {
    if (!purchaseToDelete) return;
    setDeleting(true);
    try {
      const res = await deletePurchaseAction(purchaseToDelete.id);
      if (res.success) {
        showToast('Compra excluída com sucesso.', 'success');
        setIsDeleteModalOpen(false);
        setPurchaseToDelete(null);
        loadData(page);
      } else {
        showToast(res.error || 'Erro ao excluir compra.', 'error');
      }
    } catch {
      showToast('Falha ao excluir compra.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-[#977f5a]/15 text-[#977f5a]">
              <Package className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#2d251e] tracking-tight">
                Compras de Fábrica
              </h1>
              <p className="text-xs text-[#766a5e] mt-0.5">
                Controle de aquisição e reposição de mercadoria no atacado
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleOpenNewModal}
          className="bg-[#977f5a] hover:bg-[#836d4b] text-white rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2 shadow-sm touch-pill cursor-pointer font-bold text-sm"
        >
          <PlusCircle className="w-4 h-4 stroke-[2.5]" />
          <span>Nova Compra</span>
        </Button>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Card 1: Total Comprado no Mês */}
        <Card className="p-4 rounded-3xl bg-white border-[#dfd5c4] shadow-xs">
          <div className="flex items-center justify-between text-[#766a5e] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Compras do Mês
            </span>
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#2d251e] tracking-tight">
            {formatCurrency(metrics.monthTotal)}
          </div>
          <p className="text-[11px] text-[#766a5e] mt-0.5">
            {metrics.monthCount} {metrics.monthCount === 1 ? 'pedido' : 'pedidos'} neste mês
          </p>
        </Card>

        {/* Card 2: Principal Fábrica / Fornecedor */}
        <Card className="p-4 rounded-3xl bg-white border-[#dfd5c4] shadow-xs">
          <div className="flex items-center justify-between text-[#766a5e] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Principal Fornecedor
            </span>
            <div className="p-1.5 rounded-xl bg-[#faf6f0] text-[#977f5a]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-black text-[#2d251e] truncate tracking-tight">
            {metrics.topFactory ? metrics.topFactory.name : 'Nenhum'}
          </div>
          <p className="text-[11px] text-[#766a5e] mt-0.5">
            {metrics.topFactory ? `${formatCurrency(metrics.topFactory.total)} acumulados` : 'Sem registros'}
          </p>
        </Card>

        {/* Card 3: Total Histórico Acumulado (visível em telas maiores ou col-span-2 no mobile) */}
        <Card className="p-4 rounded-3xl bg-white border-[#dfd5c4] shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#766a5e] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Total Histórico
            </span>
            <div className="p-1.5 rounded-xl bg-slate-50 text-slate-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#2d251e] tracking-tight">
            {formatCurrency(metrics.allTimeTotal)}
          </div>
          <p className="text-[11px] text-[#766a5e] mt-0.5">
            Soma de todas as reposições cadastradas
          </p>
        </Card>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87786b]" />
        <Input
          type="text"
          placeholder="Buscar por fábrica ou fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-white rounded-2xl border-[#dfd5c4] focus:border-[#977f5a] text-sm text-[#2d251e]"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#87786b] hover:text-[#2d251e] p-1 cursor-pointer"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Lista de Compras */}
      {loading ? (
        <LoadingState message="Carregando compras de fábrica..." />
      ) : purchases.length === 0 ? (
        <Card className="p-8 text-center rounded-3xl border-dashed border-2 border-[#dfd5c4] bg-[#faf6f0]/50 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#977f5a]/10 flex items-center justify-center text-[#977f5a]">
            <Package className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#2d251e]">
              Nenhuma compra de fábrica encontrada
            </h3>
            <p className="text-xs text-[#766a5e] mt-1 max-w-xs mx-auto">
              {searchTerm
                ? 'Nenhum resultado para a busca. Tente outro termo.'
                : 'Cadastre suas reposições e compras no atacado para controlar seus custos e calcular o lucro real.'}
            </p>
          </div>
          {!searchTerm && (
            <Button
              onClick={handleOpenNewModal}
              className="bg-[#977f5a] hover:bg-[#836d4b] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Registrar Primeira Compra</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2.5">
          {purchases.map((p) => (
            <Card
              key={p.id}
              className="p-3.5 sm:p-4 rounded-3xl bg-white border-[#dfd5c4] shadow-xs hover:border-[#977f5a]/50 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm sm:text-base text-[#2d251e] truncate">
                      {p.factory_name}
                    </span>
                    <Badge className="bg-[#faf6f0] text-[#977f5a] border-[#e3dacd] text-[10px] font-bold">
                      Fábrica
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#766a5e] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 opacity-70" />
                      {formatDateBR(p.purchase_date)}
                    </span>
                  </div>

                  {p.notes && (
                    <p className="text-xs text-[#64748b] bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-start gap-1.5 mt-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{p.notes}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end justify-between gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black text-[#2d251e] tracking-tight">
                      {formatCurrency(Number(p.total_amount))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 rounded-xl text-[#766a5e] hover:text-[#977f5a] hover:bg-[#faf6f0] transition-colors cursor-pointer"
                      title="Editar compra"
                      aria-label="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleConfirmDelete(p)}
                      className="p-1.5 rounded-xl text-[#766a5e] hover:text-[#b91c1c] hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Excluir compra"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="pt-2">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => loadData(p)}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal de Nova / Edição de Compra */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPurchase ? 'Editar Compra de Fábrica' : 'Nova Compra de Fábrica'}
        description="Registre as informações do pedido ou reposição de mercadoria no atacado."
      >
        <form onSubmit={handleSavePurchase} className="space-y-4 pt-1">
          {/* Campo Data da Compra */}
          <div>
            <label className="block text-xs font-bold text-[#2d251e] mb-1">
              Data da Compra *
            </label>
            <DatePicker
              value={purchaseDate}
              onChange={(d) => setPurchaseDate(d)}
            />
          </div>

          {/* Campo Fábrica / Fornecedor */}
          <div>
            <label className="block text-xs font-bold text-[#2d251e] mb-1">
              Fábrica / Fornecedor *
            </label>
            <Input
              type="text"
              list="known-factories-list"
              placeholder="Ex: Limeira Joias, Fornecedor X, Atacado Pratas"
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
              className="h-11 rounded-2xl border-[#dfd5c4] focus:border-[#977f5a]"
              required
            />
            {/* Datalist para Autocomplete Nativo */}
            {knownFactories.length > 0 && (
              <datalist id="known-factories-list">
                {knownFactories.map((fac) => (
                  <option key={fac} value={fac} />
                ))}
              </datalist>
            )}

            {/* Chips de seleção rápida caso existam fábricas cadastradas */}
            {knownFactories.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <span className="text-[10px] text-[#766a5e] font-semibold">Recentes:</span>
                {knownFactories.slice(0, 4).map((fac) => (
                  <button
                    key={fac}
                    type="button"
                    onClick={() => setFactoryName(fac)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#faf6f0] border border-[#dfd5c4] text-[#766a5e] hover:border-[#977f5a] hover:text-[#977f5a] cursor-pointer transition-colors"
                  >
                    {fac}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campo Valor Total */}
          <div>
            <label className="block text-xs font-bold text-[#2d251e] mb-1">
              Valor Total da Compra (R$) *
            </label>
            <CurrencyInput
              value={totalAmount}
              onChange={(v) => setTotalAmount(v)}
              className="h-11 rounded-2xl border-[#dfd5c4] focus:border-[#977f5a] text-lg font-bold"
            />
          </div>

          {/* Campo Observações */}
          <div>
            <label className="block text-xs font-bold text-[#2d251e] mb-1">
              Observações / Detalhes das Peças (Opcional)
            </label>
            <Input
              type="text"
              placeholder="Ex: 40 anéis banhados, 20 correntes 18k, NF 1234"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-11 rounded-2xl border-[#dfd5c4] focus:border-[#977f5a]"
            />
          </div>

          {/* Botões do Modal */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-2xl border-[#dfd5c4] text-[#766a5e] cursor-pointer text-xs"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#977f5a] hover:bg-[#836d4b] text-white rounded-2xl px-5 text-xs font-bold cursor-pointer shadow-xs"
            >
              {submitting ? 'Salvando...' : editingPurchase ? 'Salvar Alterações' : 'Registrar Compra'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Registro de Compra"
        description="Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita."
      >
        <div className="space-y-4 pt-1">
          {purchaseToDelete && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-xs space-y-1 text-rose-900">
              <p>
                <strong className="font-bold">Fábrica:</strong> {purchaseToDelete.factory_name}
              </p>
              <p>
                <strong className="font-bold">Data:</strong> {formatDateBR(purchaseToDelete.purchase_date)}
              </p>
              <p>
                <strong className="font-bold">Valor:</strong> {formatCurrency(Number(purchaseToDelete.total_amount))}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="rounded-2xl border-[#dfd5c4] text-[#766a5e] text-xs cursor-pointer"
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleDeletePurchase}
              disabled={deleting}
              className="bg-[#b91c1c] hover:bg-rose-700 text-white rounded-2xl px-4 text-xs font-bold cursor-pointer shadow-xs"
            >
              {deleting ? 'Excluindo...' : 'Sim, Excluir Compra'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
