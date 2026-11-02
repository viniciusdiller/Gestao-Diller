'use client';

import * as React from 'react';
import {
  Users,
  UserPlus,
  Search,
  MessageCircle,
  Phone,
  ShoppingBag,
  Clock,
  ChevronRight,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  getClientsAction,
  createClientAction,
  updateClientAction,
  deleteClientAction,
  getClientDetailsAction,
} from '../../actions/clients';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatCurrency, formatDateBR } from '@/lib/utils';
import { sanitizePhoneForWhatsApp } from '@/lib/services/whatsapp';

export default function ClientesPage() {
  const { showToast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clients, setClients] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  // Modal Novo Cliente
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('');
  const [newNotes, setNewNotes] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Modal Detalhes do Cliente
  const [selectedClientId, setSelectedClientId] = React.useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientDetails, setClientDetails] = React.useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);

  // Modal Edição de Cliente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientToEdit, setClientToEdit] = React.useState<any | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editPhone, setEditPhone] = React.useState('');
  const [editNotes, setEditNotes] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Modal Exclusão de Cliente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clientToDelete, setClientToDelete] = React.useState<any | null>(null);
  const [deletingClient, setDeletingClient] = React.useState(false);

  const loadClients = React.useCallback(async () => {
    setLoading(true);
    const res = await getClientsAction();
    if (res.success && res.clients) {
      setClients(res.clients);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Abre detalhes da cliente
  async function handleOpenDetails(clientId: string) {
    setSelectedClientId(clientId);
    setDetailsLoading(true);
    const res = await getClientDetailsAction(clientId);
    if (res.success) {
      setClientDetails(res);
    }
    setDetailsLoading(false);
  }

  // Criação de cliente
  async function handleCreateClient(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const res = await createClientAction({
      name: newName,
      phone: newPhone || null,
      notes: newNotes,
    });

    if (res.success) {
      setIsNewModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewNotes('');
      showToast('Cliente cadastrada com sucesso! ✨');
      loadClients();
    } else {
      setFormError(res.error || 'Erro ao cadastrar cliente.');
    }
    setSubmitting(false);
  }

  // Abre Edição de Cliente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleOpenEdit(client: any) {
    setClientToEdit(client);
    setEditName(client.name || '');
    setEditPhone(client.phone || '');
    setEditNotes(client.notes || '');
    setEditError(null);
  }

  // Salva Edição de Cliente
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientToEdit) return;
    setSavingEdit(true);
    setEditError(null);

    const res = await updateClientAction({
      id: clientToEdit.id,
      name: editName,
      phone: editPhone || null,
      notes: editNotes || null,
    });

    if (res.success) {
      setClientToEdit(null);
      showToast('Cliente atualizada com sucesso! ✨');
      loadClients();
      if (selectedClientId === clientToEdit.id) {
        handleOpenDetails(clientToEdit.id);
      }
    } else {
      setEditError(res.error || 'Erro ao atualizar cliente.');
    }
    setSavingEdit(false);
  }

  // Confirma Exclusão de Cliente
  async function handleConfirmDelete() {
    if (!clientToDelete) return;
    setDeletingClient(true);

    const res = await deleteClientAction(clientToDelete.id);
    if (res.success) {
      setClientToDelete(null);
      if (selectedClientId === clientToDelete.id) {
        setSelectedClientId(null);
        setClientDetails(null);
      }
      showToast('Cliente excluída com sucesso.');
      loadClients();
    } else {
      showToast(res.error || 'Erro ao excluir cliente.', 'error');
    }
    setDeletingClient(false);
  }

  // Filtro de busca
  const filteredClients = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header com Título e Ação */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#2d251e]">
            Clientes
          </h2>
          <p className="text-xs text-[#766a5e]">
            {clients.length} {clients.length === 1 ? 'cliente cadastrada' : 'clientes cadastradas'}
          </p>
        </div>
        <Button
          onClick={() => setIsNewModalOpen(true)}
          size="sm"
          className="gap-1.5 shadow-xs"
        >
          <UserPlus className="w-4 h-4" /> Nova Cliente
        </Button>
      </div>

      {/* Barra de Busca Touch */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#766a5e]" />
        <Input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 bg-white border-[#e4dcd0]"
        />
      </div>

      {/* Lista de Cards de Clientes (Zero Tabelas) */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#766a5e]">
          Carregando clientes...
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#977f5a]/10 flex items-center justify-center text-[#977f5a]">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-[#2d251e]">
            {search ? 'Nenhuma cliente encontrada.' : 'Nenhuma cliente cadastrada ainda.'}
          </p>
          <Button
            onClick={() => setIsNewModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            Cadastrar Primeira Cliente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredClients.map((client) => {
            const cleanPhone = sanitizePhoneForWhatsApp(client.phone || '');
            const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

            return (
              <Card
                key={client.id}
                onClick={() => handleOpenDetails(client.id)}
                className="p-4 bg-white border-[#e4dcd0] hover:border-[#977f5a] hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 cursor-pointer shadow-xs flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <h3 className="text-sm font-bold text-[#2d251e] truncate">
                    {client.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#766a5e] mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-[#977f5a]" />
                    <span>{client.phone || 'Sem WhatsApp cadastrado'}</span>
                  </div>
                  {client.notes && (
                    <p className="text-[11px] text-[#8e8174] truncate mt-1">
                      {client.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {waUrl && (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-9 h-9 rounded-full bg-[#25D366]/15 text-[#128C7E] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-all"
                      title="Abrir WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[#766a5e]">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal / Bottom-Sheet: Nova Cliente (WhatsApp Opcional) */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Cadastrar Nova Cliente"
        description="Preencha os dados da cliente para vincular às vendas"
      >
        <form onSubmit={handleCreateClient} className="space-y-3.5">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Nome Completo *
            </label>
            <Input
              type="text"
              required
              placeholder="Ex: Amanda Ferreira"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              WhatsApp com DDD (Opcional)
            </label>
            <PhoneInput
              placeholder="(00) 00000-0000"
              value={newPhone}
              onChange={setNewPhone}
              className="bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Observações (opcional)
            </label>
            <Textarea
              placeholder="Preferências, anotações de compras, créditos..."
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full text-base font-semibold shadow-md"
              size="lg"
              isLoading={submitting}
            >
              Salvar Cliente
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal / Bottom-Sheet: Detalhes e Perfil da Cliente com Editar/Excluir */}
      <Modal
        isOpen={!!selectedClientId}
        onClose={() => {
          setSelectedClientId(null);
          setClientDetails(null);
        }}
        title={clientDetails?.client?.name || 'Perfil da Cliente'}
        description={clientDetails?.client?.phone || 'Sem WhatsApp cadastrado'}
      >
        {detailsLoading ? (
          <div className="py-8 text-center text-xs text-[#766a5e]">
            Carregando histórico...
          </div>
        ) : clientDetails ? (
          <div className="space-y-4">
            {/* Ações de Gestão do Perfil: Editar e Excluir */}
            <div className="flex items-center justify-end gap-2 pb-1 border-b border-[#ebdcca]/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEdit(clientDetails.client)}
                className="gap-1.5 text-xs h-8 text-[#977f5a] border-[#977f5a]/40"
              >
                <Pencil className="w-3.5 h-3.5" /> Editar Cliente
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setClientToDelete(clientDetails.client)}
                className="gap-1.5 text-xs h-8"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Cliente
              </Button>
            </div>

            {/* Observações da Cliente se existirem */}
            {clientDetails.client?.notes && (
              <div className="p-3 rounded-xl bg-[#faf6f0] border border-[#ebdcca] text-xs space-y-1">
                <span className="font-bold text-[#977f5a] uppercase text-[10px] tracking-wider">
                  Observações:
                </span>
                <p className="text-[#52463b] font-medium leading-relaxed">
                  {clientDetails.client.notes}
                </p>
              </div>
            )}

            {/* Cards de Resumo do Perfil */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-white border border-[#e4dcd0]">
                <div className="text-[10px] font-medium text-[#766a5e] flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#977f5a]" /> Total Gasto
                </div>
                <div className="text-base font-bold text-[#2d251e] mt-1">
                  {formatCurrency(clientDetails.totalSpent)}
                </div>
                <div className="text-[10px] text-[#766a5e] mt-0.5">
                  {clientDetails.salesCount} {clientDetails.salesCount === 1 ? 'compra' : 'compras'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-[#e4dcd0]">
                <div className="text-[10px] font-medium text-[#766a5e] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#b91c1c]" /> Saldo Devedor
                </div>
                <div
                  className={`text-base font-bold mt-1 ${
                    clientDetails.outstandingBalance > 0
                      ? 'text-[#b91c1c]'
                      : 'text-[#15803d]'
                  }`}
                >
                  {formatCurrency(clientDetails.outstandingBalance)}
                </div>
                <div className="text-[10px] text-[#766a5e] mt-0.5">
                  {clientDetails.outstandingBalance > 0 ? 'Fiado em aberto' : 'Em dia'}
                </div>
              </div>
            </div>

            {/* Pagamento Mais Frequente */}
            <div className="p-3 rounded-xl bg-[#f5efe6] border border-[#e4dcd0] flex items-center justify-between text-xs">
              <span className="font-medium text-[#766a5e]">
                Forma de pagamento mais frequente:
              </span>
              <Badge variant="default" className="uppercase font-bold tracking-wider">
                {clientDetails.mostFrequentPaymentMethod}
              </Badge>
            </div>

            {/* Ação Direta WhatsApp */}
            {clientDetails.client?.phone && (
              <a
                href={`https://wa.me/${sanitizePhoneForWhatsApp(clientDetails.client.phone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold active:scale-[0.98] transition-all"
              >
                <MessageCircle className="w-4 h-4" /> Conversar no WhatsApp
              </a>
            )}

            {/* Histórico de Compras */}
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-bold text-[#2d251e] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#977f5a]" /> Histórico de Compras
              </h4>

              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {clientDetails.sales.length === 0 ? (
                <p className="text-xs text-[#766a5e] py-3 text-center">
                  Nenhuma compra registrada para esta cliente.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {clientDetails.sales.map((sale: any) => (
                    <div
                      key={sale.id}
                      className="p-2.5 rounded-xl bg-white border border-[#e4dcd0] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-[#2d251e] truncate">
                          {sale.description}
                        </p>
                        <p className="text-[10px] text-[#766a5e]">
                          {formatDateBR(sale.sale_date)} • {sale.payment_method.toUpperCase()}
                        </p>
                      </div>
                      <span className="font-bold text-[#977f5a] shrink-0">
                        {formatCurrency(Number(sale.total_amount))}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal Editar Cliente */}
      <Modal
        isOpen={!!clientToEdit}
        onClose={() => setClientToEdit(null)}
        title="Editar Cliente"
        description="Atualize as informações da cliente"
      >
        <form onSubmit={handleSaveEdit} className="space-y-3.5">
          {editError && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
              {editError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Nome Completo *
            </label>
            <Input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              WhatsApp com DDD (Opcional)
            </label>
            <PhoneInput
              placeholder="(00) 00000-0000"
              value={editPhone}
              onChange={setEditPhone}
              className="bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Observações (opcional)
            </label>
            <Textarea
              placeholder="Preferências, anotações..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="bg-white"
            />
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClientToEdit(null)}
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

      {/* Modal Confirmação de Exclusão de Cliente */}
      <Modal
        isOpen={!!clientToDelete}
        onClose={() => setClientToDelete(null)}
        title="Excluir Cliente"
        description="Esta ação removerá todos os registros desta cliente"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 space-y-1">
              <p className="font-bold">
                Tem certeza que deseja excluir &quot;{clientToDelete?.name}&quot;?
              </p>
              <p className="text-[11px] text-red-600/90 pt-1">
                Todas as vendas, parcelas e históricos vinculados a esta cliente também serão excluídos permanentemente.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClientToDelete(null)}
              className="w-1/2"
              disabled={deletingClient}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
              className="w-1/2 font-bold"
              isLoading={deletingClient}
            >
              Sim, Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
