'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  PlusCircle,
  MessageCircle,
  Pencil,
  Trash2,
  KeyRound,
  Filter,
  DollarSign,
  UserCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Percent,
  Info,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Modal } from '@/components/ui/modal';
import { DatePicker } from '@/components/ui/date-picker';
import { Combobox } from '@/components/ui/combobox';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/components/ui/toast';
import {
  getReservasAction,
  createReservaAction,
  updateReservaAction,
  deleteReservaAction,
} from '@/app/actions/aluguel-reservas';
import { getHospedesAction, createHospedeAction } from '@/app/actions/aluguel-hospedes';
import {
  formatCurrency,
  formatDateBR,
  sanitizePhoneForWhatsApp,
} from '@/lib/utils';
import {
  calculateNights,
  calculateReservaTotals,
} from '@/lib/services/aluguel-calculator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reserva = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Hospede = any;

export default function ItaunaReservasPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [loading, setLoading] = React.useState(true);
  const [reservas, setReservas] = React.useState<Reserva[]>([]);
  const [hospedes, setHospedes] = React.useState<Hospede[]>([]);

  // Filtros
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [origemFilter, setOrigemFilter] = React.useState('all');

  // Modal Nova Reserva
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Campos Nova Reserva
  const [hospedeId, setHospedeId] = React.useState('');
  const [checkin, setCheckin] = React.useState('');
  const [checkout, setCheckout] = React.useState('');
  const [numHospedes, setNumHospedes] = React.useState<number>(2);
  const [valorDiaria, setValorDiaria] = React.useState<number>(600);
  const [taxaLimpeza, setTaxaLimpeza] = React.useState<number>(180);
  const [origem, setOrigem] = React.useState<
    'airbnb' | 'booking' | 'instagram' | 'direto' | 'outros'
  >('airbnb');
  const [taxaPlataformaPercentual, setTaxaPlataformaPercentual] = React.useState<number>(16);
  const [temComissaoDani, setTemComissaoDani] = React.useState<boolean>(true);
  const [taxaDaniPercentual, setTaxaDaniPercentual] = React.useState<number>(20);
  const [statusPagamento, setStatusPagamento] = React.useState<
    'pendente' | 'parcial' | 'pago'
  >('pendente');
  const [observacoes, setObservacoes] = React.useState('');

  // Cadastro rápido inline de hóspede
  const [showQuickHospede, setShowQuickHospede] = React.useState(false);
  const [quickNome, setQuickNome] = React.useState('');
  const [quickTelefone, setQuickTelefone] = React.useState('');
  const [savingQuickHospede, setSavingQuickHospede] = React.useState(false);

  // Modal Edição
  const [reservaToEdit, setReservaToEdit] = React.useState<Reserva | null>(null);
  const [editNumHospedes, setEditNumHospedes] = React.useState(2);
  const [editValorDiaria, setEditValorDiaria] = React.useState(0);
  const [editTaxaLimpeza, setEditTaxaLimpeza] = React.useState(180);
  const [editTaxaPlataformaPercentual, setEditTaxaPlataformaPercentual] = React.useState(16);
  const [editTemComissaoDani, setEditTemComissaoDani] = React.useState(true);
  const [editTaxaDaniPercentual, setEditTaxaDaniPercentual] = React.useState(20);
  const [editStatus, setEditStatus] = React.useState('confirmada');
  const [editStatusPagamento, setEditStatusPagamento] = React.useState('pendente');
  const [editObservacoes, setEditObservacoes] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Modal Exclusão
  const [reservaToDelete, setReservaToDelete] = React.useState<Reserva | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 6;

  // Carrega dados iniciais
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [resRes, hospRes] = await Promise.all([
        fetch('/api/aluguel/reservas'),
        fetch('/api/aluguel/hospedes'),
      ]);
      const resData = await resRes.json();
      const hospData = await hospRes.json();

      if (resData.success) setReservas(resData.reservas || []);
      if (hospData.success) setHospedes(hospData.hospedes || []);
    } catch {
      const [fallbackRes, fallbackHosp] = await Promise.all([
        getReservasAction(),
        getHospedesAction(),
      ]);
      if (fallbackRes.success) setReservas(fallbackRes.reservas || []);
      if (fallbackHosp.success) setHospedes(fallbackHosp.hospedes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Se veio parâmetro de check-in na URL (ex: do calendário), abre modal automaticamente
  React.useEffect(() => {
    const checkinParam = searchParams.get('checkin');
    if (checkinParam) {
      setCheckin(checkinParam);
      setIsNewModalOpen(true);
    }
  }, [searchParams]);

  // Ajusta automaticamente as taxas padrão ao mudar de origem
  function handleOrigemChange(newOrigem: 'airbnb' | 'booking' | 'instagram' | 'direto' | 'outros') {
    setOrigem(newOrigem);
    if (newOrigem === 'airbnb') {
      setTaxaPlataformaPercentual(16);
      setTemComissaoDani(true);
      setTaxaDaniPercentual(20);
    } else if (newOrigem === 'booking') {
      setTaxaPlataformaPercentual(15);
      setTemComissaoDani(true);
      setTaxaDaniPercentual(20);
    } else {
      // Direto / WhatsApp / Instagram
      setTaxaPlataformaPercentual(0);
      // Mantém Dani como opção caso façam check-in avulso
    }
  }

  // Opções para Combobox de Hóspedes
  const hospedeOptions = React.useMemo(() => {
    return hospedes.map((h) => ({
      value: h.id,
      label: h.nome,
      sublabel: h.telefone ? `Tel: ${h.telefone}` : 'Sem WhatsApp',
    }));
  }, [hospedes]);

  // Cálculo prévio em tempo real dos valores da nova reserva
  const previewCalc = React.useMemo(() => {
    return calculateReservaTotals({
      checkin,
      checkout,
      valorDiaria,
      taxaLimpeza,
      taxaPlataformaPercentual,
      temComissaoDani,
      taxaDaniPercentual,
    });
  }, [
    checkin,
    checkout,
    valorDiaria,
    taxaLimpeza,
    taxaPlataformaPercentual,
    temComissaoDani,
    taxaDaniPercentual,
  ]);

  // Cálculo prévio em tempo real para a edição de reserva
  const editPreviewCalc = React.useMemo(() => {
    if (!reservaToEdit) return null;
    return calculateReservaTotals({
      checkin: reservaToEdit.data_checkin,
      checkout: reservaToEdit.data_checkout,
      valorDiaria: editValorDiaria,
      taxaLimpeza: editTaxaLimpeza,
      taxaPlataformaPercentual: editTaxaPlataformaPercentual,
      temComissaoDani: editTemComissaoDani,
      taxaDaniPercentual: editTaxaDaniPercentual,
    });
  }, [
    reservaToEdit,
    editValorDiaria,
    editTaxaLimpeza,
    editTaxaPlataformaPercentual,
    editTemComissaoDani,
    editTaxaDaniPercentual,
  ]);

  // Cadastro rápido de Hóspede inline
  async function handleSaveQuickHospede() {
    if (!quickNome.trim() || quickNome.trim().length < 2) {
      showToast('Nome do hóspede deve ter pelo menos 2 caracteres.', 'error');
      return;
    }
    setSavingQuickHospede(true);
    const res = await createHospedeAction({
      nome: quickNome.trim(),
      telefone: quickTelefone.trim() || null,
    });

    if (res.success && res.hospede) {
      setHospedes((prev) => [res.hospede, ...prev]);
      setHospedeId(res.hospede.id);
      setShowQuickHospede(false);
      setQuickNome('');
      setQuickTelefone('');
      showToast('Hóspede cadastrado e selecionado.');
    } else {
      showToast(res.error || 'Erro ao cadastrar hóspede.', 'error');
    }
    setSavingQuickHospede(false);
  }

  // Criação de Reserva
  async function handleCreateReserva(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!hospedeId) {
      setFormError('Selecione um hóspede para a reserva.');
      return;
    }
    if (!checkin || !checkout) {
      setFormError('Selecione as datas de check-in e check-out.');
      return;
    }
    if (checkout <= checkin) {
      setFormError('A data de check-out deve ser posterior ao check-in.');
      return;
    }

    setSubmitting(true);
    const res = await createReservaAction({
      hospede_id: hospedeId,
      data_checkin: checkin,
      data_checkout: checkout,
      num_hospedes: Number(numHospedes || 1),
      valor_diaria: Number(valorDiaria),
      taxa_limpeza: Number(taxaLimpeza),
      taxa_plataforma_percentual: Number(taxaPlataformaPercentual),
      tem_comissao_dani: Boolean(temComissaoDani),
      taxa_dani_percentual: Number(taxaDaniPercentual),
      origem,
      status: 'confirmada',
      status_pagamento: statusPagamento,
      valor_pago: statusPagamento === 'pago' ? previewCalc.valor_total : 0,
      observacoes: observacoes || null,
    });

    if (res.success) {
      setIsNewModalOpen(false);
      setCheckin('');
      setCheckout('');
      setHospedeId('');
      setObservacoes('');
      showToast('Reserva criada com sucesso!');
      loadData();
    } else {
      setFormError(res.error || 'Erro ao criar reserva.');
    }
    setSubmitting(false);
  }

  // Abrir Modal de Edição
  function handleOpenEdit(r: Reserva) {
    setReservaToEdit(r);
    setEditNumHospedes(Number(r.num_hospedes || 1));
    setEditValorDiaria(Number(r.valor_diaria));
    setEditTaxaLimpeza(r.taxa_limpeza !== undefined ? Number(r.taxa_limpeza) : 180);
    setEditTaxaPlataformaPercentual(
      r.taxa_plataforma_percentual !== undefined
        ? Number(r.taxa_plataforma_percentual)
        : r.origem === 'airbnb'
        ? 16
        : 0
    );
    setEditTemComissaoDani(Boolean(r.tem_comissao_dani ?? (r.origem === 'airbnb')));
    setEditTaxaDaniPercentual(Number(r.taxa_dani_percentual ?? 20));
    setEditStatus(r.status);
    setEditStatusPagamento(r.status_pagamento);
    setEditObservacoes(r.observacoes || '');
    setEditError(null);
  }

  // Salvar Edição
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!reservaToEdit) return;

    setSavingEdit(true);
    setEditError(null);

    const res = await updateReservaAction({
      id: reservaToEdit.id,
      num_hospedes: Number(editNumHospedes || 1),
      valor_diaria: Number(editValorDiaria),
      taxa_limpeza: Number(editTaxaLimpeza),
      taxa_plataforma_percentual: Number(editTaxaPlataformaPercentual),
      tem_comissao_dani: Boolean(editTemComissaoDani),
      taxa_dani_percentual: Number(editTaxaDaniPercentual),
      status: editStatus as any,
      status_pagamento: editStatusPagamento as any,
      observacoes: editObservacoes || null,
    });

    if (res.success) {
      setReservaToEdit(null);
      showToast('Reserva atualizada com sucesso!');
      loadData();
    } else {
      setEditError(res.error || 'Erro ao atualizar reserva.');
    }
    setSavingEdit(false);
  }

  // Excluir Reserva
  async function handleDeleteReserva() {
    if (!reservaToDelete) return;
    setDeleting(true);
    const res = await deleteReservaAction(reservaToDelete.id);
    if (res.success) {
      setReservaToDelete(null);
      showToast('Reserva excluída com sucesso.');
      loadData();
    } else {
      showToast(res.error || 'Erro ao excluir reserva.', 'error');
    }
    setDeleting(false);
  }

  // Filtros aplicados
  const filteredReservas = React.useMemo(() => {
    return reservas.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (origemFilter !== 'all' && r.origem !== origemFilter) return false;
      return true;
    });
  }, [reservas, statusFilter, origemFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredReservas.length / pageSize) || 1;
  const paginatedReservas = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReservas.slice(start, start + pageSize);
  }, [filteredReservas, currentPage, pageSize]);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Topo: Título e Botão Nova Reserva */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-[#0369a1]" /> Reservas da Casa
          </h2>
          <p className="text-xs sm:text-sm text-[#64748b]">
            Controle de diárias, comissões e lucro líquido da Casa Itaúna
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setIsNewModalOpen(true);
          }}
          className="bg-[#0369a1] hover:bg-[#0284c7] text-white font-semibold text-xs sm:text-sm shadow-2xs h-10 px-4 rounded-xl active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4 mr-1.5" /> Nova Reserva
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-white rounded-2xl border border-[#e2e8f0] shadow-2xs">
        <div className="flex items-center gap-1 text-xs text-[#64748b] font-medium pl-2">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtrar:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 rounded-xl border border-[#e2e8f0] bg-white px-2.5 text-xs font-semibold text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0369a1]"
        >
          <option value="all">Todos os Status</option>
          <option value="confirmada">Confirmada</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="concluida">Concluída</option>
          <option value="cancelada">Cancelada</option>
        </select>

        <select
          value={origemFilter}
          onChange={(e) => {
            setOrigemFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 rounded-xl border border-[#e2e8f0] bg-white px-2.5 text-xs font-semibold text-[#0f172a] focus:outline-none focus:ring-1 focus:ring-[#0369a1]"
        >
          <option value="all">Todas as Origens</option>
          <option value="airbnb">Airbnb</option>
          <option value="booking">Booking.com</option>
          <option value="direto">Direto / WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="outros">Outros</option>
        </select>

        <div className="ml-auto pr-2 text-xs text-[#64748b]">
          Total: <strong className="text-[#0f172a]">{filteredReservas.length}</strong>
        </div>
      </div>

      {/* Lista de Reservas ou Estado Vazio */}
      {loading ? (
        <LoadingState message="Carregando reservas..." />
      ) : filteredReservas.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl bg-white border border-[#e2e8f0] shadow-2xs space-y-3">
          <CalendarDays className="w-10 h-10 text-[#0369a1] mx-auto opacity-70" />
          <h3 className="text-base font-bold text-[#0f172a]">Nenhuma reserva encontrada</h3>
          <p className="text-xs text-[#64748b] max-w-sm mx-auto">
            Cadastre a primeira reserva da Casa Itaúna para controlar disponibilidade e lucros.
          </p>
          <Button
            onClick={() => setIsNewModalOpen(true)}
            className="bg-[#0369a1] text-white hover:bg-[#0284c7] font-semibold text-xs"
          >
            Cadastrar Reserva Agora
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {paginatedReservas.map((reserva, idx) => {
              const phone = sanitizePhoneForWhatsApp(reserva.aluguel_hospedes?.telefone || '');
              const waUrl = phone ? `https://wa.me/${phone}` : null;

              return (
                <Card
                  key={reserva.id}
                  style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
                  className="p-4 bg-white border-[#e2e8f0] shadow-2xs hover:border-[#38bdf8] hover:shadow-xs transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Topo do Card: Hóspede e Badges */}
                    <div className="flex items-start justify-between pb-2 border-b border-[#f1f5f9]">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-[#0f172a] truncate">
                            {reserva.aluguel_hospedes?.nome || 'Hóspede'}
                          </h3>
                          <Badge
                            className={`text-[9px] uppercase font-bold px-1.5 py-0 ${
                              reserva.status === 'confirmada'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : reserva.status === 'em_andamento'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : reserva.status === 'cancelada'
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }`}
                          >
                            {reserva.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[#64748b] mt-0.5 flex items-center gap-1">
                          Canal: <strong className="uppercase text-[#0369a1]">{reserva.origem}</strong>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-base font-extrabold text-[#0369a1]">
                          {formatCurrency(Number(reserva.valor_total))}
                        </span>
                        <p className="text-[10px] font-semibold text-[#64748b]">
                          {reserva.num_diarias} noites • {reserva.num_hospedes || 1} hósp.
                        </p>
                      </div>
                    </div>

                    {/* Datas de Check-in e Check-out */}
                    <div className="grid grid-cols-2 gap-2 py-2 text-xs">
                      <div className="p-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                        <span className="text-[10px] text-[#64748b] font-medium block">Check-in</span>
                        <span className="font-bold text-[#0f172a]">
                          {formatDateBR(reserva.data_checkin)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                        <span className="text-[10px] text-[#64748b] font-medium block">Check-out</span>
                        <span className="font-bold text-[#0f172a]">
                          {formatDateBR(reserva.data_checkout)}
                        </span>
                      </div>
                    </div>

                    {/* Breakdown Financeiro */}
                    <div className="text-[11px] text-[#64748b] space-y-1 pt-1 border-t border-[#f1f5f9]">
                      <div className="flex justify-between">
                        <span>Diária x Noites:</span>
                        <span className="font-medium text-[#0f172a]">
                          {reserva.num_diarias} x {formatCurrency(Number(reserva.valor_diaria))}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>(-) Despesa Faxina:</span>
                        <span className="font-medium text-slate-700">
                          - {formatCurrency(Number(reserva.taxa_limpeza || 180))}
                        </span>
                      </div>
                      {Number(reserva.taxa_plataforma) > 0 && (
                        <div className="flex justify-between text-rose-600">
                          <span>
                            (-) Taxa {reserva.origem.toUpperCase()} ({reserva.taxa_plataforma_percentual || 16}%):
                          </span>
                          <span className="font-medium">
                            - {formatCurrency(Number(reserva.taxa_plataforma))}
                          </span>
                        </div>
                      )}
                      {reserva.tem_comissao_dani && (
                        <div className="flex justify-between text-amber-700">
                          <span>(-) Dani ({reserva.taxa_dani_percentual || 20}% restante):</span>
                          <span className="font-medium">
                            - {formatCurrency(Number(reserva.valor_comissao_dani || 0))}
                          </span>
                        </div>
                      )}
                      <div className="pt-1 border-t border-[#e2e8f0] flex justify-between font-bold text-[#0369a1]">
                        <span>Lucro Líquido Real:</span>
                        <span>
                          {formatCurrency(
                            Number(
                              reserva.lucro_liquido_real ??
                                (reserva.valor_total - (reserva.taxa_plataforma || 0))
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações: WhatsApp, Editar, Excluir */}
                  <div className="pt-3 border-t border-[#f1f5f9] mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {waUrl ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-semibold active:scale-95 transition-transform shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      ) : (
                        <span className="text-[10px] text-[#64748b] bg-slate-100 px-2 py-1 rounded-lg">
                          Sem Whats
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(reserva)}
                        className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0369a1] hover:bg-[#f1f5f9] transition-colors"
                        title="Editar reserva"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setReservaToDelete(reserva)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                        title="Excluir reserva"
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
            totalItems={filteredReservas.length}
            pageSize={pageSize}
            itemName="reservas"
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {/* Modal Nova Reserva */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setShowQuickHospede(false);
        }}
        title="Registrar Nova Reserva"
        description="Defina as datas, comissões e taxas da Casa Itaúna"
      >
        <form onSubmit={handleCreateReserva} className="space-y-3.5">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {formError}
            </div>
          )}

          {/* Seleção de Hóspede com Combobox */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#0f172a]">
                Hóspede Responsável *
              </label>
              <button
                type="button"
                onClick={() => setShowQuickHospede(!showQuickHospede)}
                className="text-[11px] font-bold text-[#0369a1] hover:underline"
              >
                {showQuickHospede ? 'Selecionar da Lista' : '+ Novo Hóspede'}
              </button>
            </div>

            {showQuickHospede ? (
              <div className="p-3 rounded-2xl bg-[#f0f9ff] border border-[#bae6fd] space-y-2">
                <p className="text-xs font-bold text-[#0369a1]">Cadastro Rápido de Hóspede</p>
                <Input
                  placeholder="Nome completo do hóspede *"
                  value={quickNome}
                  onChange={(e) => setQuickNome(e.target.value)}
                  className="h-10 text-xs bg-white"
                />
                <PhoneInput
                  placeholder="(21) 99999-8888 (opcional)"
                  value={quickTelefone}
                  onChange={setQuickTelefone}
                  className="h-10 text-xs bg-white"
                />
                <Button
                  type="button"
                  onClick={handleSaveQuickHospede}
                  isLoading={savingQuickHospede}
                  size="sm"
                  className="w-full bg-[#0369a1] text-white text-xs font-semibold"
                >
                  Salvar e Selecionar Hóspede
                </Button>
              </div>
            ) : (
              <Combobox
                options={hospedeOptions}
                value={hospedeId}
                onChange={setHospedeId}
                placeholder="Selecione o hóspede..."
                searchPlaceholder="Buscar por nome ou telefone..."
                emptyText="Nenhum hóspede encontrado."
              />
            )}
          </div>

          {/* Datas de Check-in, Check-out e Quantidade de Hóspedes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Check-in *</label>
              <DatePicker
                value={checkin}
                onChange={setCheckin}
                placeholder="Data entrada..."
                align="left"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Check-out *</label>
              <DatePicker
                value={checkout}
                onChange={setCheckout}
                placeholder="Data saída..."
                align="right"
              />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-[#0f172a] flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#0369a1]" /> Hóspedes *
              </label>
              <Input
                type="number"
                min="1"
                step="1"
                value={numHospedes}
                onChange={(e) => setNumHospedes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                placeholder="Ex: 2"
                className="h-11 bg-white font-bold"
              />
            </div>
          </div>

          {previewCalc.num_diarias > 0 && (
            <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs flex justify-between items-center">
              <span className="text-[#64748b]">Período e ocupação:</span>
              <strong className="text-[#0369a1] font-bold">
                {previewCalc.num_diarias} noites • {numHospedes} hóspede{numHospedes > 1 ? 's' : ''}
              </strong>
            </div>
          )}

          {/* Tarifa Dinâmica e Taxa de Faxina */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">
                Valor da Diária (R$) *
              </label>
              <CurrencyInput
                value={valorDiaria}
                onChange={setValorDiaria}
                className="h-11 bg-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">
                Taxa de Faxina (R$) *
              </label>
              <CurrencyInput
                value={taxaLimpeza}
                onChange={setTaxaLimpeza}
                className="h-11 bg-white font-semibold"
              />
            </div>
          </div>

          {/* Origem da Reserva e Comissão Plataforma em % */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Origem / Canal</label>
              <select
                value={origem}
                onChange={(e) =>
                  handleOrigemChange(
                    e.target.value as 'airbnb' | 'booking' | 'instagram' | 'direto' | 'outros'
                  )
                }
                className="w-full h-11 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold text-[#0f172a]"
              >
                <option value="airbnb">Airbnb (16%)</option>
                <option value="booking">Booking.com (15%)</option>
                <option value="direto">Direto / WhatsApp (0%)</option>
                <option value="instagram">Instagram (0%)</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a] flex items-center justify-between">
                <span>Taxa Plataforma (%)</span>
                <span className="text-[10px] text-rose-600 font-bold">
                  {formatCurrency(previewCalc.taxa_plataforma)}
                </span>
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={taxaPlataformaPercentual}
                onChange={(e) => setTaxaPlataformaPercentual(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 16"
                className="h-11 bg-white text-rose-600 font-bold"
              />
            </div>
          </div>

          {/* Opção da Comissão da Dani */}
          <div className="p-3 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={temComissaoDani}
                  onChange={(e) => setTemComissaoDani(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0369a1] focus:ring-[#0369a1] accent-[#0369a1] cursor-pointer"
                />
                <span className="text-xs font-bold text-[#0f172a]">
                  Comissão da Dani (Check-in / Checkout / Gestão)
                </span>
              </label>
              {temComissaoDani && (
                <span className="text-xs font-bold text-amber-800">
                  {formatCurrency(previewCalc.valor_comissao_dani)}
                </span>
              )}
            </div>

            {temComissaoDani && (
              <div className="pl-6 space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748b]">Porcentagem:</span>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={taxaDaniPercentual}
                      onChange={(e) => setTaxaDaniPercentual(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs bg-white font-bold"
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#64748b]">% sobre saldo</span>
                </div>
                <p className="text-[11px] text-[#64748b] leading-tight">
                  Calculada como {taxaDaniPercentual}% sobre o saldo após deduzir a taxa da plataforma e a despesa de faxina.
                </p>
              </div>
            )}
          </div>

          {/* Resumo Financeiro em Tempo Real */}
          <div className="p-3.5 rounded-2xl bg-[#f0f9ff] border border-[#bae6fd] space-y-1.5 text-xs">
            <div className="flex justify-between text-[#64748b]">
              <span>Diárias ({previewCalc.num_diarias} noites):</span>
              <span className="font-semibold text-[#0f172a]">
                {previewCalc.num_diarias} x {formatCurrency(valorDiaria)}
              </span>
            </div>
            <div className="pt-1 border-t border-[#bae6fd]/60 flex justify-between font-bold text-[#0f172a]">
              <span>Total da Reserva:</span>
              <span className="text-[#0369a1] font-extrabold text-sm">
                {formatCurrency(previewCalc.valor_total)}
              </span>
            </div>

            {previewCalc.taxa_plataforma > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>(-) Taxa {origem.toUpperCase()} ({taxaPlataformaPercentual}%):</span>
                <span className="font-medium">- {formatCurrency(previewCalc.taxa_plataforma)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>(-) Despesa de Faxina:</span>
              <span className="font-medium">- {formatCurrency(previewCalc.taxa_limpeza)}</span>
            </div>

            <div className="flex justify-between text-[#64748b] text-[11px] pt-0.5 border-t border-dashed border-[#bae6fd]">
              <span>Saldo pós Plataforma e Faxina:</span>
              <span className="font-bold text-[#0f172a]">
                {formatCurrency(previewCalc.saldo_apos_plataforma_e_faxina)}
              </span>
            </div>

            {temComissaoDani && (
              <div className="flex justify-between text-amber-800">
                <span>(-) Comissão Dani ({taxaDaniPercentual}% sobre saldo):</span>
                <span className="font-semibold">
                  - {formatCurrency(previewCalc.valor_comissao_dani)}
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-[#bae6fd] flex justify-between font-black text-sm text-[#0369a1]">
              <span>Lucro Líquido Real:</span>
              <span>{formatCurrency(previewCalc.lucro_liquido_real)}</span>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#0f172a]">Observações</label>
            <Input
              placeholder="Ex: Horário de chegada, pets, pedidos especiais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="h-10 text-xs bg-white"
            />
          </div>

          <Button
            type="submit"
            isLoading={submitting}
            className="w-full bg-[#0369a1] hover:bg-[#0284c7] text-white font-semibold h-11 rounded-xl shadow-2xs"
          >
            Confirmar Reserva
          </Button>
        </form>
      </Modal>

      {/* Modal Editar Reserva */}
      <Modal
        isOpen={Boolean(reservaToEdit)}
        onClose={() => setReservaToEdit(null)}
        title="Editar Reserva"
        description="Ajuste tarifas, comissões ou status da locação"
      >
        {reservaToEdit && editPreviewCalc && (
          <form onSubmit={handleSaveEdit} className="space-y-3.5">
            {editError && (
              <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Diária (R$)</label>
                <CurrencyInput
                  value={editValorDiaria}
                  onChange={setEditValorDiaria}
                  className="h-11 bg-white font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Faxina (R$)</label>
                <CurrencyInput
                  value={editTaxaLimpeza}
                  onChange={setEditTaxaLimpeza}
                  className="h-11 bg-white font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a] flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#0369a1]" /> Hóspedes
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={editNumHospedes}
                  onChange={(e) => setEditNumHospedes(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-11 bg-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Status Reserva</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold"
                >
                  <option value="confirmada">Confirmada</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Status Pagamento</label>
                <select
                  value={editStatusPagamento}
                  onChange={(e) => setEditStatusPagamento(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#e2e8f0] bg-white px-3 text-xs font-semibold"
                >
                  <option value="pendente">Pendente</option>
                  <option value="parcial">Parcial</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a] flex items-center justify-between">
                <span>Taxa Plataforma (%)</span>
                <span className="text-xs text-rose-600 font-bold">
                  {formatCurrency(editPreviewCalc.taxa_plataforma)}
                </span>
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={editTaxaPlataformaPercentual}
                onChange={(e) => setEditTaxaPlataformaPercentual(parseFloat(e.target.value) || 0)}
                className="h-11 bg-white text-rose-600 font-bold"
              />
            </div>

            <div className="p-3 rounded-2xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editTemComissaoDani}
                    onChange={(e) => setEditTemComissaoDani(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0369a1] focus:ring-[#0369a1] accent-[#0369a1] cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#0f172a]">Comissão da Dani</span>
                </label>
                {editTemComissaoDani && (
                  <span className="text-xs font-bold text-amber-800">
                    {formatCurrency(editPreviewCalc.valor_comissao_dani)}
                  </span>
                )}
              </div>

              {editTemComissaoDani && (
                <div className="pl-6 flex items-center gap-2">
                  <div className="w-24">
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      value={editTaxaDaniPercentual}
                      onChange={(e) => setEditTaxaDaniPercentual(parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs bg-white font-bold"
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#64748b]">% sobre saldo restante</span>
                </div>
              )}
            </div>

            {/* Resumo Financeiro da Edição */}
            <div className="p-3 rounded-2xl bg-[#f0f9ff] border border-[#bae6fd] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#64748b]">Total da Reserva:</span>
                <span className="font-bold text-[#0f172a]">
                  {formatCurrency(editPreviewCalc.valor_total)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-[#0369a1]">
                <span>Lucro Líquido Real:</span>
                <span>{formatCurrency(editPreviewCalc.lucro_liquido_real)}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Observações</label>
              <Input
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                className="h-10 text-xs bg-white"
              />
            </div>

            <Button
              type="submit"
              isLoading={savingEdit}
              className="w-full bg-[#0369a1] hover:bg-[#0284c7] text-white font-semibold h-11 rounded-xl"
            >
              Salvar Alterações
            </Button>
          </form>
        )}
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={Boolean(reservaToDelete)}
        onClose={() => setReservaToDelete(null)}
        title="Excluir Reserva"
        description="Tem certeza que deseja excluir esta reserva?"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-[#64748b]">
            Esta ação não poderá ser desfeita. O período ficará livre novamente no calendário da casa.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setReservaToDelete(null)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteReserva}
              isLoading={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
            >
              Sim, Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
