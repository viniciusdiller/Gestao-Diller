'use client';

import * as React from 'react';
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
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { calculateNights } from '@/lib/services/aluguel-calculator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Reserva = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Hospede = any;

export default function ItaunaReservasPage() {
  const { showToast } = useToast();
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
  const [valorDiaria, setValorDiaria] = React.useState<number>(600);
  const [taxaLimpeza, setTaxaLimpeza] = React.useState<number>(200);
  const [taxaPlataforma, setTaxaPlataforma] = React.useState<number>(0);
  const [origem, setOrigem] = React.useState<'airbnb' | 'booking' | 'instagram' | 'direto' | 'outros'>('direto');
  const [statusPagamento, setStatusPagamento] = React.useState<'pendente' | 'parcial' | 'pago'>('pendente');
  const [observacoes, setObservacoes] = React.useState('');

  // Cadastro rápido inline de hóspede
  const [showQuickHospede, setShowQuickHospede] = React.useState(false);
  const [quickNome, setQuickNome] = React.useState('');
  const [quickTelefone, setQuickTelefone] = React.useState('');
  const [savingQuickHospede, setSavingQuickHospede] = React.useState(false);

  // Modal Edição
  const [reservaToEdit, setReservaToEdit] = React.useState<Reserva | null>(null);
  const [editValorDiaria, setEditValorDiaria] = React.useState(0);
  const [editTaxaLimpeza, setEditTaxaLimpeza] = React.useState(0);
  const [editTaxaPlataforma, setEditTaxaPlataforma] = React.useState(0);
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

  // Opções para Combobox de Hóspedes
  const hospedeOptions = React.useMemo(() => {
    return hospedes.map((h) => ({
      value: h.id,
      label: h.nome,
      sublabel: h.telefone ? `Tel: ${h.telefone}` : 'Sem WhatsApp',
    }));
  }, [hospedes]);

  // Cálculo prévio de noites e total em tempo real
  const previewNights = React.useMemo(() => {
    return calculateNights(checkin, checkout);
  }, [checkin, checkout]);

  const previewTotal = React.useMemo(() => {
    return (previewNights * (valorDiaria || 0)) + (taxaLimpeza || 0);
  }, [previewNights, valorDiaria, taxaLimpeza]);

  // Cadastro rápido de Hóspede
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
      valor_diaria: Number(valorDiaria),
      taxa_limpeza: Number(taxaLimpeza),
      taxa_plataforma: Number(taxaPlataforma),
      origem,
      status: 'confirmada',
      status_pagamento: statusPagamento,
      valor_pago: statusPagamento === 'pago' ? previewTotal : 0,
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

  // Abrir Edição
  function handleOpenEdit(r: Reserva) {
    setReservaToEdit(r);
    setEditValorDiaria(Number(r.valor_diaria));
    setEditTaxaLimpeza(Number(r.taxa_limpeza));
    setEditTaxaPlataforma(Number(r.taxa_plataforma));
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
      valor_diaria: Number(editValorDiaria),
      taxa_limpeza: Number(editTaxaLimpeza),
      taxa_plataforma: Number(editTaxaPlataforma),
      status: editStatus as any,
      status_pagamento: editStatusPagamento as any,
      observacoes: editObservacoes || null,
    });

    if (res.success) {
      setReservaToEdit(null);
      showToast('Reserva atualizada com sucesso.');
      loadData();
    } else {
      setEditError(res.error || 'Erro ao atualizar reserva.');
    }
    setSavingEdit(false);
  }

  // Excluir
  async function handleConfirmDelete() {
    if (!reservaToDelete) return;
    setDeleting(true);

    const res = await deleteReservaAction(reservaToDelete.id);
    if (res.success) {
      setReservaToDelete(null);
      showToast('Reserva excluída.');
      loadData();
    } else {
      showToast(res.error || 'Erro ao excluir reserva.', 'error');
    }
    setDeleting(false);
  }

  // Filtros aplicados
  const filteredReservas = React.useMemo(() => {
    return reservas.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchOrigem = origemFilter === 'all' || r.origem === origemFilter;
      return matchStatus && matchOrigem;
    });
  }, [reservas, statusFilter, origemFilter]);

  const totalPages = Math.ceil(filteredReservas.length / pageSize) || 1;
  const paginatedReservas = filteredReservas.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-[#0369a1]" /> Reservas da Casa
          </h2>
          <p className="text-xs sm:text-sm text-[#64748b]">
            {filteredReservas.length} reserva(s) registradas
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          size="sm"
          className="bg-[#0369a1] hover:bg-[#0284c7] text-white shadow-xs gap-1.5 text-xs font-bold"
        >
          <PlusCircle className="w-4 h-4" /> Nova Reserva
        </Button>
      </div>

      {/* Filtros de Status e Origem */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          ['all', 'Todas'],
          ['confirmada', 'Confirmadas'],
          ['em_andamento', 'Em Andamento'],
          ['concluida', 'Concluídas'],
          ['cancelada', 'Canceladas'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`px-3 py-1.5 rounded-xl font-bold touch-pill transition-all shrink-0 ${
              statusFilter === val
                ? 'bg-[#0369a1] text-white shadow-xs'
                : 'bg-white text-[#64748b] border border-[#cbd5e1]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista de Reservas */}
      {loading ? (
        <LoadingState message="Carregando reservas da Casa Itaúna..." />
      ) : filteredReservas.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#0369a1]/10 flex items-center justify-center text-[#0369a1]">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-[#0f172a]">
            Nenhuma reserva encontrada para este filtro.
          </p>
          <Button
            onClick={() => setIsNewModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs border-[#0369a1] text-[#0369a1]"
          >
            Cadastrar Primeira Reserva
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {paginatedReservas.map((reserva, idx) => {
              const phone = sanitizePhoneForWhatsApp(reserva.aluguel_hospedes?.telefone || '');
              const waUrl = phone ? `https://wa.me/${phone}` : null;
              const isPaid = reserva.status_pagamento === 'pago';

              return (
                <Card
                  key={reserva.id}
                  style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
                  className="p-4 bg-white border-[#cbd5e1] shadow-xs hover:border-[#0369a1] hover:shadow-md hover:-translate-y-0.5 touch-card animate-slide-up transition-all duration-200 flex flex-col justify-between"
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
                            className={`text-[9px] uppercase font-black px-1.5 py-0 ${
                              reserva.status === 'confirmada'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : reserva.status === 'em_andamento'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : reserva.status === 'cancelada'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : 'bg-gray-100 text-gray-800 border-gray-300'
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
                        <span className="text-base font-black text-[#0369a1]">
                          {formatCurrency(Number(reserva.valor_total))}
                        </span>
                        <p className="text-[10px] font-semibold text-[#64748b]">
                          {reserva.num_diarias} noites
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

                    {/* Detalhes Financeiros da Diária */}
                    <div className="text-[11px] text-[#64748b] space-y-0.5 pt-1">
                      <div className="flex justify-between">
                        <span>Diária:</span>
                        <span className="font-bold text-[#0f172a]">{formatCurrency(Number(reserva.valor_diaria))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxa de Limpeza:</span>
                        <span className="font-semibold text-[#0f172a]">{formatCurrency(Number(reserva.taxa_limpeza))}</span>
                      </div>
                      {Number(reserva.taxa_plataforma) > 0 && (
                        <div className="flex justify-between text-[#ef4444]">
                          <span>Comissão Plataforma:</span>
                          <span className="font-semibold">- {formatCurrency(Number(reserva.taxa_plataforma))}</span>
                        </div>
                      )}
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-bold active:scale-90 transition-transform shadow-2xs"
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
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
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
        description="Defina as datas e a tarifa dinâmica da Casa Itaúna"
      >
        <form onSubmit={handleCreateReserva} className="space-y-3.5">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
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
                <Input
                  placeholder="WhatsApp com DDD (opcional)"
                  value={quickTelefone}
                  onChange={(e) => setQuickTelefone(e.target.value)}
                  className="h-10 text-xs bg-white"
                />
                <Button
                  type="button"
                  onClick={handleSaveQuickHospede}
                  isLoading={savingQuickHospede}
                  size="sm"
                  className="w-full bg-[#0369a1] text-white text-xs font-bold"
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

          {/* Datas de Check-in e Check-out com DatePicker ShadCN */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Check-in *</label>
              <DatePicker
                value={checkin}
                onChange={setCheckin}
                placeholder="Data entrada..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Check-out *</label>
              <DatePicker
                value={checkout}
                onChange={setCheckout}
                placeholder="Data saída..."
              />
            </div>
          </div>

          {previewNights > 0 && (
            <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#cbd5e1] text-xs flex justify-between items-center">
              <span className="text-[#64748b]">Período selecionado:</span>
              <strong className="text-[#0369a1] font-bold">{previewNights} noites</strong>
            </div>
          )}

          {/* Tarifa Dinâmica por Noite */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">
                Valor da Diária (R$) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={valorDiaria}
                onChange={(e) => setValorDiaria(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 650.00"
                className="h-11 bg-white font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">
                Taxa de Limpeza (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={taxaLimpeza}
                onChange={(e) => setTaxaLimpeza(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 200.00"
                className="h-11 bg-white"
              />
            </div>
          </div>

          {/* Origem da Reserva e Taxa de Plataforma */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Origem / Canal</label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value as any)}
                className="w-full h-11 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-semibold text-[#0f172a]"
              >
                <option value="direto">Direto / WhatsApp</option>
                <option value="airbnb">Airbnb</option>
                <option value="booking">Booking.com</option>
                <option value="instagram">Instagram</option>
                <option value="outros">Outros</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">
                Comissão Plataforma (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={taxaPlataforma}
                onChange={(e) => setTaxaPlataforma(parseFloat(e.target.value) || 0)}
                placeholder="Ex: 350.00"
                className="h-11 bg-white text-red-600 font-semibold"
              />
            </div>
          </div>

          {/* Resumo do Valor Total */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#f0f9ff] to-[#e0f2fe] border border-[#bae6fd] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#64748b]">Total da Reserva:</span>
              <p className="text-lg font-black text-[#0369a1]">{formatCurrency(previewTotal)}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#64748b]">Lucro Líquido:</span>
              <p className="text-sm font-bold text-emerald-700">
                {formatCurrency(previewTotal - (taxaPlataforma || 0))}
              </p>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#0f172a]">Observações</label>
            <Input
              placeholder="Ex: Horário especial de check-in, pet pequeno porte..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="h-10 text-xs bg-white"
            />
          </div>

          <Button
            type="submit"
            isLoading={submitting}
            className="w-full bg-[#0369a1] hover:bg-[#0284c7] text-white font-bold h-11"
          >
            Confirmar Reserva
          </Button>
        </form>
      </Modal>

      {/* Modal Editar Reserva */}
      <Modal
        isOpen={!!reservaToEdit}
        onClose={() => setReservaToEdit(null)}
        title="Editar Reserva"
        description="Ajuste tarifas ou status da locação"
      >
        {reservaToEdit && (
          <form onSubmit={handleSaveEdit} className="space-y-3.5">
            {editError && (
              <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
                {editError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Valor Diária (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValorDiaria}
                  onChange={(e) => setEditValorDiaria(parseFloat(e.target.value) || 0)}
                  className="h-11 bg-white font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Taxa Limpeza (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editTaxaLimpeza}
                  onChange={(e) => setEditTaxaLimpeza(parseFloat(e.target.value) || 0)}
                  className="h-11 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a]">Status Reserva</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-11 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-semibold"
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
                  className="w-full h-11 rounded-xl border border-[#cbd5e1] bg-white px-3 text-xs font-semibold"
                >
                  <option value="pendente">Pendente</option>
                  <option value="parcial">Parcial</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Comissão Plataforma (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={editTaxaPlataforma}
                onChange={(e) => setEditTaxaPlataforma(parseFloat(e.target.value) || 0)}
                className="h-11 bg-white text-red-600 font-bold"
              />
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
              className="w-full bg-[#0369a1] hover:bg-[#0284c7] text-white font-bold h-11"
            >
              Salvar Alterações
            </Button>
          </form>
        )}
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        isOpen={!!reservaToDelete}
        onClose={() => setReservaToDelete(null)}
        title="Excluir Reserva"
        description="Tem certeza que deseja excluir esta reserva?"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-[#64748b]">
            Esta ação não poderá ser desfeita. A data de check-in ficará livre novamente no calendário.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReservaToDelete(null)}
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
              Excluir Reserva
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
