'use client';

import * as React from 'react';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MessageCircle,
  Pencil,
  Trash2,
  CalendarCheck,
  Award,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/components/ui/toast';
import {
  getHospedesAction,
  createHospedeAction,
  updateHospedeAction,
  deleteHospedeAction,
} from '@/app/actions/aluguel-hospedes';
import {
  formatCurrency,
  sanitizePhoneForWhatsApp,
} from '@/lib/utils';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Hospede = any;

export default function ItaunaHospedesPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [hospedes, setHospedes] = React.useState<Hospede[]>([]);
  const [search, setSearch] = React.useState('');

  // Modal Novo Hóspede
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Modal Editar Hóspede
  const [hospedeToEdit, setHospedeToEdit] = React.useState<Hospede | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [editNotes, setEditNotes] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Modal Exclusão
  const [hospedeToDelete, setHospedeToDelete] = React.useState<Hospede | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 6;

  const loadHospedes = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/aluguel/hospedes');
      const data = await res.json();
      if (data.success) {
        setHospedes(data.hospedes || []);
      }
    } catch {
      const fallback = await getHospedesAction();
      if (fallback.success) {
        setHospedes(fallback.hospedes || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadHospedes();
  }, [loadHospedes]);

  // Criação
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const res = await createHospedeAction({
      nome: name,
      telefone: phone || null,
      notas_observacoes: notes || null,
    });

    if (res.success) {
      setIsNewModalOpen(false);
      setName('');
      setPhone('');
      setNotes('');
      showToast('Hóspede cadastrado com sucesso!');
      loadHospedes();
    } else {
      setFormError(res.error || 'Erro ao cadastrar hóspede.');
    }
    setSubmitting(false);
  }

  // Edição
  function handleOpenEdit(h: Hospede) {
    setHospedeToEdit(h);
    setEditName(h.nome);
    setEditPhone(h.telefone || '');
    setEditNotes(h.notas_observacoes || '');
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!hospedeToEdit) return;

    setSavingEdit(true);
    setEditError(null);

    const res = await updateHospedeAction({
      id: hospedeToEdit.id,
      nome: editName,
      telefone: editPhone || null,
      notas_observacoes: editNotes || null,
    });

    if (res.success) {
      setHospedeToEdit(null);
      showToast('Hóspede atualizado com sucesso.');
      loadHospedes();
    } else {
      setEditError(res.error || 'Erro ao atualizar.');
    }
    setSavingEdit(false);
  }

  // Exclusão
  async function handleConfirmDelete() {
    if (!hospedeToDelete) return;
    setDeleting(true);

    const res = await deleteHospedeAction(hospedeToDelete.id);
    if (res.success) {
      setHospedeToDelete(null);
      showToast('Hóspede excluído.');
      loadHospedes();
    } else {
      showToast(res.error || 'Erro ao excluir.', 'error');
    }
    setDeleting(false);
  }

  // Filtro de Busca
  const filteredHospedes = React.useMemo(() => {
    if (!search.trim()) return hospedes;
    const q = search.toLowerCase().trim();
    return hospedes.filter(
      (h) =>
        h.nome.toLowerCase().includes(q) ||
        (h.telefone && h.telefone.includes(q))
    );
  }, [hospedes, search]);

  const totalPages = Math.ceil(filteredHospedes.length / pageSize) || 1;
  const paginatedHospedes = filteredHospedes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0f172a] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#0369a1]" /> Hóspedes da Casa
          </h2>
          <p className="text-xs sm:text-sm text-[#64748b]">
            CRM e histórico de locatários da Casa Itaúna
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          size="sm"
          className="bg-[#0369a1] hover:bg-[#0284c7] text-white shadow-xs gap-1.5 text-xs font-bold"
        >
          <UserPlus className="w-4 h-4" /> Novo Hóspede
        </Button>
      </div>

      {/* Busca Instantânea */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748b]" />
        <Input
          type="text"
          placeholder="Buscar hóspede por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white border-[#cbd5e1]"
        />
      </div>

      {/* Lista de Hóspedes */}
      {loading ? (
        <LoadingState message="Carregando hóspedes..." />
      ) : filteredHospedes.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#0369a1]/10 flex items-center justify-center text-[#0369a1]">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-[#0f172a]">
            {search ? 'Nenhum hóspede encontrado para esta busca.' : 'Nenhum hóspede cadastrado ainda.'}
          </p>
          <Button
            onClick={() => setIsNewModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs border-[#0369a1] text-[#0369a1]"
          >
            Cadastrar Primeiro Hóspede
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {paginatedHospedes.map((hospede, idx) => {
              const cleanPhone = sanitizePhoneForWhatsApp(hospede.telefone || '');
              const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

              return (
                <Card
                  key={hospede.id}
                  style={{ animationDelay: `${Math.min(idx * 30, 150)}ms` }}
                  className="p-4 bg-white border-[#cbd5e1] shadow-xs hover:border-[#0369a1] hover:shadow-md hover:-translate-y-0.5 touch-card animate-slide-up transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between pb-2 border-b border-[#f1f5f9]">
                      <div className="min-w-0 pr-2">
                        <h3 className="text-sm font-bold text-[#0f172a] truncate">
                          {hospede.nome}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-[#64748b] mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-[#0369a1]" />
                          <span>{hospede.telefone || 'Sem WhatsApp'}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#0369a1] bg-[#e0f2fe] px-2 py-0.5 rounded-full">
                          {hospede.totalEstadias} {hospede.totalEstadias === 1 ? 'estadia' : 'estadias'}
                        </span>
                      </div>
                    </div>

                    {/* Histórico Financeiro do Hóspede */}
                    <div className="py-2 flex items-center justify-between text-xs">
                      <span className="text-[#64748b]">Total Investido:</span>
                      <strong className="text-[#0f172a] font-bold">
                        {formatCurrency(Number(hospede.totalGasto))}
                      </strong>
                    </div>

                    {/* Notas / Observações de comportamento */}
                    {hospede.notas_observacoes && (
                      <div className="p-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[11px] text-[#475569] italic mt-1">
                        &quot;{hospede.notas_observacoes}&quot;
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="pt-3 border-t border-[#f1f5f9] mt-2 flex items-center justify-between">
                    <div>
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
                        onClick={() => handleOpenEdit(hospede)}
                        className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0369a1] hover:bg-[#f1f5f9] transition-colors"
                        title="Editar hóspede"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setHospedeToDelete(hospede)}
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        title="Excluir hóspede"
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
            totalItems={filteredHospedes.length}
            pageSize={pageSize}
            itemName="hóspedes"
            onPageChange={(p) => setCurrentPage(p)}
          />
        </div>
      )}

      {/* Modal Novo Hóspede */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Cadastrar Novo Hóspede"
        description="Registre os dados de contato do locatário"
      >
        <form onSubmit={handleCreate} className="space-y-3.5">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#0f172a]">Nome Completo *</label>
            <Input
              placeholder="Ex: Gabriel Medina"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#0f172a]">Telefone / WhatsApp</label>
            <Input
              placeholder="Ex: 21999998888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#0f172a]">Notas e Observações</label>
            <Input
              placeholder="Ex: Excelente hóspede, família tranquila, surfista..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-11 bg-white"
            />
          </div>

          <Button
            type="submit"
            isLoading={submitting}
            className="w-full bg-[#0369a1] hover:bg-[#0284c7] text-white font-bold h-11"
          >
            Salvar Hóspede
          </Button>
        </form>
      </Modal>

      {/* Modal Editar Hóspede */}
      <Modal
        isOpen={!!hospedeToEdit}
        onClose={() => setHospedeToEdit(null)}
        title="Editar Hóspede"
        description="Atualize as informações de contato"
      >
        {hospedeToEdit && (
          <form onSubmit={handleSaveEdit} className="space-y-3.5">
            {editError && (
              <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
                {editError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Nome Completo *</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                className="h-11 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Telefone / WhatsApp</label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="h-11 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#0f172a]">Notas e Observações</label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="h-11 bg-white"
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
        isOpen={!!hospedeToDelete}
        onClose={() => setHospedeToDelete(null)}
        title="Excluir Hóspede"
        description="Tem certeza que deseja excluir este hóspede?"
      >
        <div className="space-y-3 pt-1">
          <p className="text-xs text-[#64748b]">
            Apenas hóspedes sem reservas ativas podem ser excluídos.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHospedeToDelete(null)}
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

