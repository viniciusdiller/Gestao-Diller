'use client';

import * as React from 'react';
import {
  Receipt,
  PlusCircle,
  Pencil,
  Trash2,
  Calendar,
  Zap,
  Droplets,
  Wifi,
  Brush,
  Wrench,
  Hammer,
  HelpCircle,
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
  getDespesasAction,
  createDespesaAction,
  updateDespesaAction,
  deleteDespesaAction,
} from '@/app/actions/aluguel-despesas';
import { formatCurrency, formatDateBR, getTodayDateString } from '@/lib/utils';
import { AluguelCategoriaDespesa } from '@/lib/validations/aluguel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Despesa = any;

const categoryLabels: Record<string, { label: string; icon: any; color: string }> = {
  energia: { label: 'Energia / Luz', icon: Zap, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  agua: { label: 'Água', icon: Droplets, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  internet: { label: 'Internet', icon: Wifi, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
  faxina: { label: 'Faxina e Higienização', icon: Brush, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  manutencao: { label: 'Manutenção', icon: Wrench, color: 'text-slate-600 bg-slate-50 border-slate-200' },
  reparos: { label: 'Reparos e Consertos', icon: Hammer, color: 'text-rose-500 bg-rose-50 border-rose-200' },
  outros: { label: 'Outros Custos', icon: HelpCircle, color: 'text-neutral-500 bg-neutral-50 border-neutral-200' },
};

export default function ItaunaDespesasPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [despesas, setDespesas] = React.useState<Despesa[]>([]);
  const [categoriaFilter, setCategoriaFilter] = React.useState('all');

  // Modal Nova Despesa
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [categoria, setCategoria] = React.useState<AluguelCategoriaDespesa>('energia');
  const [descricao, setDescricao] = React.useState('');
  const [valor, setValor] = React.useState<number>(0);
  const [dataDespesa, setDataDespesa] = React.useState(() => getTodayDateString());
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Modal Editar Despesa
  const [despesaToEdit, setDespesaToEdit] = React.useState<Despesa | null>(null);
  const [editCategoria, setEditCategoria] = React.useState<AluguelCategoriaDespesa>('energia');
  const [editDescricao, setEditDescricao] = React.useState('');
  const [editValor, setEditValor] = React.useState(0);
  const [editData, setEditData] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Modal Exclusão
  const [despesaToDelete, setDespesaToDelete] = React.useState<Despesa | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 6;

  const loadDespesas = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aluguel/despesas');
      const data = await res.json();
      if (data.success) {
        setDespesas(data.despesas || []);
      }
    } catch {
      const fallback = await getDespesasAction();
      if (fallback.success) {
        setDespesas(fallback.despesas || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDespesas();
  }, [loadDespesas]);

  // Criação
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!descricao.trim()) {
      setFormError('Informe a descrição da despesa.');
      return;
    }
    if (!valor || valor <= 0) {
      setFormError('O valor deve ser maior que zero.');
      return;
    }
    if (!dataDespesa) {
      setFormError('Selecione a data da despesa.');
      return;
    }

    setSubmitting(true);
    const res = await createDespesaAction({
      categoria,
      descricao: descricao.trim(),
      valor: Number(valor),
      data_despesa: dataDespesa,
    });

    if (res.success) {
      setIsNewModalOpen(false);
      setDescricao('');
      setValor(0);
      showToast('Despesa lançada com sucesso.');
      loadDespesas();
    } else {
      setFormError(res.error || 'Erro ao lançar despesa.');
    }
    setSubmitting(false);
  }

  // Edição
  function handleOpenEdit(d: Despesa) {
    setDespesaToEdit(d);
    setEditCategoria(d.categoria);
    setEditDescricao(d.descricao);
    setEditValor(Number(d.valor));
    setEditData(d.data_despesa);
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!despesaToEdit) return;

    setSavingEdit(true);
    setEditError(null);

    const res = await updateDespesaAction({
      id: despesaToEdit.id,
      categoria: editCategoria,
      descricao: editDescricao.trim(),
      valor: Number(editValor),
      data_despesa: editData,
    });

    if (res.success) {
      setDespesaToEdit(null);
      showToast('Despesa atualizada com sucesso.');
      loadDespesas();
    } else {
      setEditError(res.error || 'Erro ao atualizar despesa.');
    }
    setSavingEdit(false);
  }

  // Exclusão
  async function handleConfirmDelete() {
    if (!despesaToDelete) return;
    setDeleting(true);

    const res = await deleteDespesaAction(despesaToDelete.id);
    if (res.success) {
      setDespesaToDelete(null);
      showToast('Despesa excluída.');
      loadDespesas();
    } else {
      showToast(res.error || 'Erro ao excluir.', 'error');
    }
    setDeleting(false);
  }

  // Filtros aplicados
  const filteredDespesas = React.useMemo(() => {
    if (categoriaFilter === 'all') return despesas;
    return despesas.filter((d) => d.categoria === categoriaFilter);
  }, [despesas, categoriaFilter]);

  // Total das despesas filtradas
  const totalValor = React.useMemo(() => {
    return filteredDespesas.reduce((acc, d) => acc + Number(d.valor || 0), 0);
  }, [filteredDespesas]);

  const totalPages = Math.ceil(filteredDespesas.length / pageSize) || 1;
  const paginatedDespesas = filteredDespesas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#ef4444]" /> Despesas Operacionais
          </h2>
          <p className="text-xs sm:text-sm text-[#64748b]">
            Controle de custos da Casa Itaúna abatidos do lucro líquido
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          size="sm"
          className="bg-[#0369a1] hover:bg-[#0284c7] text-white shadow-xs gap-1.5 text-xs font-bold"
        >
          <PlusCircle className="w-4 h-4" /> Lançar Despesa
        </Button>
      </div>

      {/* Card de Total em Destaque */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-red-50 to-orange-50 border border-red-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-[#ef4444] uppercase tracking-wider">
            Total em Despesas
          </span>
          <p className="text-2xl font-black text-[#0f172a] mt-0.5">
            {formatCurrency(totalValor)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-[#64748b]">
            {filteredDespesas.length} lançamento(s)
          </span>
        </div>
      </div>

      {/* Filtro por Categoria */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setCategoriaFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold touch-pill transition-all shrink-0 ${
            categoriaFilter === 'all'
              ? 'bg-[#0369a1] text-white shadow-xs'
              : 'bg-white text-[#64748b] border border-[#cbd5e1]'
          }`}
        >
          Todas
        </button>

        {Object.entries(categoryLabels).map(([key, item]) => (
          <button
            key={key}
            onClick={() => setCategoriaFilter(key)}
            className={`px-3 py-1.5 rounded-xl font-bold touch-pill transition-all shrink-0 ${
              categoriaFilter === key
                ? 'bg-[#0369a1] text-white shadow-xs'
                : 'bg-white text-[#64748b] border border-[#cbd5e1]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Lista de Despesas */}
      {loading ? (
        <LoadingState message="Carregando despesas operacionais..." />
      ) : filteredDespesas.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-100 flex items-center justify-center text-[#ef4444]">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-[#0f172a]">
            Nenhuma despesa encontrada para esta categoria.
          </p>
          <Button
            onClick={() => setIsNewModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs border-[#0369a1] text-[#0369a1]"
          >
            Lançar Primeira Despesa
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {paginatedDespesas.map((despesa, idx) => {
              const catInfo = categoryLabels[despesa.categoria] || categoryLabels.outros;
              const Icon = catInfo.icon;

              return (
                <Card
                  key={despesa.id}
                  style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
                  className="p-4 bg-white border-[#cbd5e1] shadow-xs hover:border-[#ef4444] hover:shadow-md hover:-translate-y-0.5 touch-card animate-slide-up transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between pb-2 border-b border-[#f1f5f9]">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${catInfo.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-[#0f172a] truncate">
                            {despesa.descricao}
                          </h3>
                          <span className="text-[10px] font-semibold text-[#64748b]">
                            {catInfo.label}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-black text-[#ef4444]">
                          {formatCurrency(Number(despesa.valor))}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-[#64748b]">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#0369a1]" />
                        {formatDateBR(despesa.data_despesa)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#f1f5f9] mt-2 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(despesa)}
                      className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0369a1] hover:bg-[#f1f5f9] transition-colors"
                      title="Editar despesa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDespesaToDelete(despesa)}
                      className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                      title="Excluir despesa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredDespesas.length}
            pageSize={pageSize}
            itemName="despesas"
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {/* Modal Nova Despesa */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Lançar Despesa Operacional"
        description="Custos e manutenções da Casa Itaúna"
      >
        <form onSubmit={handleCreate} className="space-y-3.5">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#0f172a]">Categoria *</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as any)}
              className="w-full h-11 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#0f172a]"
            >
              <option value="energia">Energia / Luz (Enel)</option>
              <option value="agua">Água (Águas de Juturnaíba)</option>
              <option value="internet">Internet Fibra</option>
              <option value="faxina">Faxina / Manutenção</option>
              <option value="manutencao">Manutenção Geral</option>
              <option value="reparos">Reparos e Consertos</option>
              <option value="outros">Outros Custos</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#0f172a]">Descrição da Despesa *</label>
            <Input
              placeholder="Ex: Conta de Luz Enel Outubro"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              required
              className="h-11 bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Valor (R$) *</label>
              <CurrencyInput
                value={valor}
                onChange={setValor}
                className="h-11 bg-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Data *</label>
              <DatePicker
                value={dataDespesa}
                onChange={setDataDespesa}
                placeholder="Data..."
              />
            </div>
          </div>

          <Button
            type="submit"
            isLoading={submitting}
            className="w-full bg-[#0369a1] hover:bg-[#0284c7] text-white font-bold h-11"
          >
            Lançar Despesa
          </Button>
        </form>
      </Modal>

      {/* Modal Editar Despesa */}
      <Modal
        isOpen={!!despesaToEdit}
        onClose={() => setDespesaToEdit(null)}
        title="Editar Despesa"
        description="Ajuste os dados do lançamento"
      >
        {despesaToEdit && (
          <form onSubmit={handleSaveEdit} className="space-y-3.5">
            {editError && (
              <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
                {editError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Categoria *</label>
              <select
                value={editCategoria}
                onChange={(e) => setEditCategoria(e.target.value as any)}
                className="w-full h-11 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-semibold"
              >
                <option value="energia">Energia / Luz</option>
                <option value="agua">Água</option>
                <option value="internet">Internet</option>
                <option value="faxina">Faxina</option>
                <option value="manutencao">Manutenção</option>
                <option value="reparos">Reparos</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Descrição *</label>
              <Input
                value={editDescricao}
                onChange={(e) => setEditDescricao(e.target.value)}
                required
                className="h-11 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Valor (R$) *</label>
                <CurrencyInput
                  value={editValor}
                  onChange={setEditValor}
                  className="h-11 bg-white font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Data *</label>
                <DatePicker
                  value={editData}
                  onChange={setEditData}
                  placeholder="Data..."
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={savingEdit}
              className="w-full bg-[#0369a1] hover:bg-[#0284c7] text-white font-bold h-11"
            >
              Salvar Alterações
            </Button>
          </form>
        )}
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={!!despesaToDelete}
        onClose={() => setDespesaToDelete(null)}
        title="Excluir Despesa"
        description="Tem certeza que deseja excluir esta despesa?"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-[#64748b]">
            O valor será automaticamente estornado do cálculo de despesas e o lucro líquido real será recalculado.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDespesaToDelete(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              isLoading={deleting}
              className="text-xs font-bold"
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

