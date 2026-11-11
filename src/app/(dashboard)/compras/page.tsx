'use client';

import * as React from 'react';
import {
  Plus,
  Search,
  Calendar,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Building,
  Check,
  TrendingDown,
} from 'lucide-react';
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
import { formatCurrency, formatDateBR, getTodayDateString, cn } from '@/lib/utils';

export default function ComprasPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [purchases, setPurchases] = React.useState<PurchaseRow[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalRecords, setTotalRecords] = React.useState(0);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Sugestões reais (APENAS o que já foi salvo pelo usuário no banco)
  const [registeredFactories, setRegisteredFactories] = React.useState<string[]>([]);

  // Métricas financeiras
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

  // Estado do autocomplete dinâmico
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const factoryInputRef = React.useRef<HTMLInputElement>(null);
  const suggestionsRef = React.useRef<HTMLDivElement>(null);

  // Modal Exclusão
  const [purchaseToDelete, setPurchaseToDelete] = React.useState<PurchaseRow | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Carregar dados reais
  const loadData = React.useCallback(
    async (targetPage = 1, search = searchTerm) => {
      setLoading(true);
      try {
        const [listRes, metricsRes, factoriesRes] = await Promise.all([
          getPurchasesAction({ page: targetPage, limit: 15, search }),
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
          // Apenas o que vem do banco real do usuário, SEM hardcoding!
          setRegisteredFactories(factoriesRes.factories || []);
        }
      } catch {
        showToast('Falha na comunicação com o servidor.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [searchTerm, showToast]
  );

  React.useEffect(() => {
    loadData(1);
  }, [loadData]);

  // Busca com debounce
  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadData(1, searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm, loadData]);

  // Fechar dropdown de sugestões ao clicar fora
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        factoryInputRef.current &&
        !factoryInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra as sugestões do histórico conforme o que está sendo digitado
  const matchingSuggestions = React.useMemo(() => {
    const trimmed = factoryName.trim().toLowerCase();
    if (!trimmed) return [];
    return registeredFactories.filter(
      (f) => f.toLowerCase().includes(trimmed) && f.toLowerCase() !== trimmed
    );
  }, [factoryName, registeredFactories]);

  function handleOpenNewModal() {
    setEditingPurchase(null);
    setFactoryName('');
    setTotalAmount(0);
    setPurchaseDate(getTodayDateString());
    setNotes('');
    setShowSuggestions(false);
    setIsModalOpen(true);
  }

  function handleOpenEditModal(p: PurchaseRow) {
    setEditingPurchase(p);
    setFactoryName(p.factory_name);
    setTotalAmount(Number(p.total_amount));
    setPurchaseDate(p.purchase_date);
    setNotes(p.notes || '');
    setShowSuggestions(false);
    setIsModalOpen(true);
  }

  function handleSelectSuggestion(selected: string) {
    setFactoryName(selected);
    setShowSuggestions(false);
  }

  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault();

    const cleanFactory = factoryName.trim();
    if (!cleanFactory) {
      showToast('Digite o nome da fábrica ou fornecedor.', 'error');
      return;
    }

    if (totalAmount <= 0) {
      showToast('Informe o valor total da compra.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingPurchase) {
        const res = await updatePurchaseAction({
          id: editingPurchase.id,
          factory_name: cleanFactory,
          total_amount: totalAmount,
          purchase_date: purchaseDate,
          notes: notes.trim() || null,
        });

        if (res.success) {
          showToast('Registro de compra atualizado.', 'success');
          setIsModalOpen(false);
          loadData(page);
        } else {
          showToast(res.error || 'Não foi possível atualizar a compra.', 'error');
        }
      } else {
        const res = await createPurchaseAction({
          factory_name: cleanFactory,
          total_amount: totalAmount,
          purchase_date: purchaseDate,
          notes: notes.trim() || null,
        });

        if (res.success) {
          showToast('Compra registrada com sucesso!', 'success');
          setIsModalOpen(false);
          loadData(1);
        } else {
          showToast(res.error || 'Não foi possível registrar a compra.', 'error');
        }
      }
    } catch {
      showToast('Erro de conexão ao salvar compra.', 'error');
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
        showToast('Compra removida do sistema.', 'success');
        setIsDeleteModalOpen(false);
        setPurchaseToDelete(null);
        loadData(page);
      } else {
        showToast(res.error || 'Erro ao remover compra.', 'error');
      }
    } catch {
      showToast('Erro ao remover compra.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      {/* Cabeçalho Limpo e Direto */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#2d251e]">
            Compras
          </h1>
          <p className="text-xs text-[#766a5e] mt-0.5">
            Reposições de mercadoria e custos de fornecedores
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="h-10 px-4 rounded-xl bg-[#2d251e] hover:bg-[#1f1914] text-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nova Compra</span>
        </button>
      </div>

      {/* Painel de Resumo Financeiro Elegante */}
      <div className="bg-white rounded-2xl border border-[#e3dacd] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#766a5e]">
              Total Comprado no Mês
            </span>
            <div className="text-3xl font-bold tracking-tight text-[#2d251e] mt-1 tabular-nums">
              {formatCurrency(metrics.monthTotal)}
            </div>
            <p className="text-xs text-[#766a5e] mt-1">
              {metrics.monthCount === 0
                ? 'Nenhuma compra registrada neste mês'
                : `${metrics.monthCount} ${metrics.monthCount === 1 ? 'pedido registrado' : 'pedidos registrados'}`}
            </p>
          </div>

          {metrics.topFactory && (
            <div className="sm:border-l sm:border-[#e3dacd] sm:pl-6 pt-3 sm:pt-0 border-t border-[#f0e9df] sm:border-t-0">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#766a5e]">
                Maior Fornecedor
              </span>
              <div className="text-base font-bold text-[#2d251e] mt-1 truncate max-w-[200px]">
                {metrics.topFactory.name}
              </div>
              <p className="text-xs text-[#766a5e] mt-0.5 tabular-nums">
                {formatCurrency(metrics.topFactory.total)} acumulados
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Busca Minimalista */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#87786b]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar por nome de fábrica ou observação..."
          className="w-full h-11 pl-10 pr-9 text-xs sm:text-sm bg-white border border-[#e3dacd] rounded-xl text-[#2d251e] placeholder:text-[#87786b] focus:outline-none focus:border-[#977f5a] focus:ring-1 focus:ring-[#977f5a] transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#87786b] hover:text-[#2d251e] rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Extrato / Lista de Compras */}
      {loading ? (
        <LoadingState message="Carregando extrato de compras..." />
      ) : purchases.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-[#e3dacd]">
          <div className="w-10 h-10 rounded-xl bg-[#faf6f0] text-[#766a5e] mx-auto flex items-center justify-center mb-3">
            <Building className="w-5 h-5 stroke-[1.8]" />
          </div>
          <h3 className="text-sm font-semibold text-[#2d251e]">
            {searchTerm ? 'Nenhuma compra encontrada' : 'Nenhuma compra cadastrada'}
          </h3>
          <p className="text-xs text-[#766a5e] mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'Tente buscar por outro termo ou limpe o filtro.'
              : 'Clique em "Nova Compra" para registrar seu primeiro pedido de fábrica.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenNewModal}
              className="mt-4 px-4 py-2 rounded-xl bg-[#977f5a] hover:bg-[#836d4b] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Adicionar Compra
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e3dacd] overflow-hidden shadow-xs divide-y divide-[#f0e9df]">
          {purchases.map((purchase) => (
            <div
              key={purchase.id}
              className="p-4 flex items-center justify-between gap-3 hover:bg-[#faf6f0]/50 transition-colors"
            >
              {/* Informações da Fábrica e Data */}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-[#2d251e] truncate">
                    {purchase.factory_name}
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#766a5e]">
                  <span>{formatDateBR(purchase.purchase_date)}</span>
                  {purchase.notes && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[240px] text-[#87786b]">
                        {purchase.notes}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Valor e Ações */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <span className="text-sm sm:text-base font-bold text-[#2d251e] tabular-nums">
                    {formatCurrency(Number(purchase.total_amount))}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(purchase)}
                    className="p-1.5 text-[#87786b] hover:text-[#2d251e] hover:bg-[#faf6f0] rounded-lg transition-colors cursor-pointer"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleConfirmDelete(purchase)}
                    className="p-1.5 text-[#87786b] hover:text-[#b91c1c] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* Modal: Formulário de Nova / Edição de Compra */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPurchase ? 'Editar Compra' : 'Registrar Compra'}
        description="Preencha os dados do pedido de fábrica."
      >
        <form onSubmit={handleSavePurchase} className="space-y-4 pt-1">
          {/* Campo Data */}
          <div>
            <label className="block text-xs font-semibold text-[#2d251e] mb-1">
              Data da Compra *
            </label>
            <DatePicker
              value={purchaseDate}
              onChange={(d) => setPurchaseDate(d)}
            />
          </div>

          {/* Campo Fábrica com Autocomplete Reativo ao Histórico */}
          <div className="relative">
            <label className="block text-xs font-semibold text-[#2d251e] mb-1">
              Fábrica / Fornecedor *
            </label>
            <input
              ref={factoryInputRef}
              type="text"
              required
              placeholder="Digite o nome da fábrica..."
              value={factoryName}
              autoComplete="off"
              onFocus={() => {
                if (factoryName.trim() && matchingSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onChange={(e) => {
                setFactoryName(e.target.value);
                setShowSuggestions(true);
              }}
              className="w-full h-11 px-3 text-sm bg-white border border-[#e3dacd] rounded-xl text-[#2d251e] placeholder:text-[#87786b] focus:outline-none focus:border-[#977f5a] focus:ring-1 focus:ring-[#977f5a] transition-all"
            />

            {/* Popover de Sugestões: Aparece SOMENTE quando houver fábricas já cadastradas correspondentes */}
            {showSuggestions && matchingSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#e3dacd] rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-[#f0e9df] animate-in fade-in duration-150"
              >
                <div className="px-3 py-1.5 bg-[#faf6f0] text-[10px] font-semibold text-[#766a5e] uppercase tracking-wider">
                  Fábricas cadastradas anteriormente:
                </div>
                {matchingSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className="w-full px-3 py-2 text-left text-xs text-[#2d251e] hover:bg-[#faf6f0] flex items-center justify-between group cursor-pointer transition-colors"
                  >
                    <span className="font-medium">{suggestion}</span>
                    <span className="text-[10px] text-[#977f5a] opacity-0 group-hover:opacity-100 transition-opacity">
                      Selecionar
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Campo Valor Total */}
          <div>
            <label className="block text-xs font-semibold text-[#2d251e] mb-1">
              Valor Total (R$) *
            </label>
            <CurrencyInput
              value={totalAmount}
              onChange={(v) => setTotalAmount(v)}
              className="h-11 rounded-xl border-[#e3dacd] focus:border-[#977f5a] text-lg font-bold text-[#2d251e]"
            />
          </div>

          {/* Campo Observações Opcional */}
          <div>
            <label className="block text-xs font-semibold text-[#2d251e] mb-1">
              Observações / Peças (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: 30 brincos ponto de luz, 15 gargantilhas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3 text-xs bg-white border border-[#e3dacd] rounded-xl text-[#2d251e] placeholder:text-[#87786b] focus:outline-none focus:border-[#977f5a] focus:ring-1 focus:ring-[#977f5a] transition-all"
            />
          </div>

          {/* Ações do Modal */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#766a5e] hover:bg-[#faf6f0] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#2d251e] hover:bg-[#1f1914] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting
                ? 'Salvando...'
                : editingPurchase
                ? 'Salvar Alterações'
                : 'Salvar Compra'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Exclusão */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Compra"
        description="Esta ação removerá o registro financeiro desta compra."
      >
        <div className="space-y-4 pt-1">
          {purchaseToDelete && (
            <div className="p-3.5 bg-[#faf6f0] border border-[#e3dacd] rounded-xl text-xs space-y-1">
              <p className="font-semibold text-[#2d251e]">
                {purchaseToDelete.factory_name}
              </p>
              <p className="text-[#766a5e]">
                {formatDateBR(purchaseToDelete.purchase_date)} • {formatCurrency(Number(purchaseToDelete.total_amount))}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#766a5e] hover:bg-[#faf6f0] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeletePurchase}
              disabled={deleting}
              className="px-4 py-2 rounded-xl bg-[#b91c1c] hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
