'use client';

import * as React from 'react';
import {
  ShoppingBag,
  PlusCircle,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { getSalesAction, createSaleAction } from '../../actions/sales';
import { getClientsAction } from '../../actions/clients';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateBR } from '@/lib/utils';
import { generateInstallments, InstallmentItem } from '@/lib/services/installment-calculator';
import { PaymentMethod } from '@/lib/validations';

export default function VendasPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sales, setSales] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [clients, setClients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Modal Nova Venda
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [clientId, setClientId] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [totalAmountStr, setTotalAmountStr] = React.useState('');
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>('pix');

  // Parcelamento / Fiado
  const [numInstallments, setNumInstallments] = React.useState(2);
  const [intervalType, setIntervalType] = React.useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [firstDueDate, setFirstDueDate] = React.useState('');
  const [generatedInstallments, setGeneratedInstallments] = React.useState<InstallmentItem[]>([]);

  const [submitting, setSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const [salesRes, clientsRes] = await Promise.all([
      getSalesAction(),
      getClientsAction(),
    ]);
    if (salesRes.success) setSales(salesRes.sales);
    if (clientsRes.success) setClients(clientsRes.clients);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadData();
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setFirstDueDate(d.toISOString().slice(0, 10));
  }, [loadData]);

  // Recalcula parcelas ao alterar valores do fiado
  React.useEffect(() => {
    if (paymentMethod === 'fiado') {
      const amount = parseFloat(totalAmountStr.replace(',', '.'));
      if (amount > 0 && numInstallments > 0 && firstDueDate) {
        try {
          const items = generateInstallments({
            totalAmount: amount,
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
  }, [paymentMethod, totalAmountStr, numInstallments, firstDueDate, intervalType]);

  async function handleCreateSale(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    const amount = parseFloat(totalAmountStr.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Informe um valor de venda válido.');
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
      total_amount: amount,
      payment_method: paymentMethod,
      installments:
        paymentMethod === 'fiado' && generatedInstallments.length > 0
          ? generatedInstallments
          : undefined,
    });

    if (res.success) {
      setIsModalOpen(false);
      setClientId('');
      setDescription('');
      setTotalAmountStr('');
      setPaymentMethod('pix');
      setGeneratedInstallments([]);
      loadData();
    } else {
      setErrorMsg(res.error || 'Erro ao registrar venda.');
    }
    setSubmitting(false);
  }

  const paymentLabels: Record<PaymentMethod, string> = {
    pix: 'PIX',
    dinheiro: 'Dinheiro',
    cartao_debito: 'Débito',
    cartao_credito: 'Crédito',
    fiado: 'Fiado / A Prazo',
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#2d251e]">
            Vendas
          </h2>
          <p className="text-xs text-[#766a5e]">
            Histórico e novos registros de pedidos
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="gap-1.5 shadow-xs"
        >
          <PlusCircle className="w-4 h-4" /> Registrar Venda
        </Button>
      </div>

      {/* Lista de Cards de Vendas */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[#766a5e]">
          Carregando vendas...
        </div>
      ) : sales.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#977f5a]/10 flex items-center justify-center text-[#977f5a]">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-[#2d251e]">
            Nenhuma venda registrada ainda.
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
        <div className="space-y-2.5">
          {sales.map((sale) => (
            <Card
              key={sale.id}
              className="p-3.5 bg-white border-[#e4dcd0] shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#2d251e] truncate">
                      {sale.clients?.name || 'Cliente'}
                    </span>
                    <Badge
                      variant={
                        sale.payment_method === 'fiado' && sale.status === 'pending'
                          ? 'warning'
                          : 'success'
                      }
                      className="text-[10px] px-1.5 py-0 uppercase"
                    >
                      {sale.payment_method === 'fiado' && sale.status === 'pending'
                        ? 'Fiado (Pendente)'
                        : paymentLabels[sale.payment_method as PaymentMethod] || sale.payment_method}
                    </Badge>
                  </div>
                  <p className="text-xs text-[#52463b] mt-1 font-medium">
                    {sale.description}
                  </p>
                  <p className="text-[10px] text-[#766a5e] mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#977f5a]" />
                    {formatDateBR(sale.sale_date)}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-[#977f5a]">
                    {formatCurrency(Number(sale.total_amount))}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal / Bottom-Sheet: Nova Venda */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Registrar Nova Venda"
        description="Preencha os detalhes da peça vendida"
      >
        <form onSubmit={handleCreateSale} className="space-y-3.5">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Selecionar Cliente */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Cliente *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="flex h-12 w-full rounded-xl border border-[#dfd5c4] bg-white px-3.5 py-2 text-base text-[#2d251e] focus:border-[#977f5a] focus:outline-none"
            >
              <option value="">Selecione uma cliente...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Descrição das Peças *
            </label>
            <Input
              type="text"
              required
              placeholder="Ex: Conjunto ponto de luz dourado e anel solitário"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Valor Total */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#2d251e]">
              Valor Total (R$) *
            </label>
            <Input
              type="number"
              step="0.01"
              required
              placeholder="0,00"
              value={totalAmountStr}
              onChange={(e) => setTotalAmountStr(e.target.value)}
              className="bg-white text-lg font-bold text-[#977f5a]"
            />
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#2d251e]">
              Forma de Pagamento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['pix', 'PIX'],
                  ['cartao_credito', 'Cartão Crédito'],
                  ['cartao_debito', 'Cartão Débito'],
                  ['dinheiro', 'Dinheiro'],
                  ['fiado', 'Fiado / Parcelado'],
                ] as const
              ).map(([method, label]) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method as PaymentMethod)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === method
                      ? 'border-[#977f5a] bg-[#977f5a]/15 text-[#836d4b] shadow-xs'
                      : 'border-[#dfd5c4] bg-white text-[#766a5e] hover:bg-[#faf7f2]'
                  } ${method === 'fiado' ? 'col-span-2' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Seção Condicional de Fiado / Parcelamento */}
          {paymentMethod === 'fiado' && (
            <div className="p-3.5 rounded-2xl bg-[#faf6f0] border border-[#ebdcca] space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#977f5a]">
                <Sparkles className="w-4 h-4" /> Configuração do Fiado / Parcelamento
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#2d251e]">
                    Número de Parcelas
                  </label>
                  <select
                    value={numInstallments}
                    onChange={(e) => setNumInstallments(parseInt(e.target.value, 10))}
                    className="h-11 w-full rounded-xl border border-[#dfd5c4] bg-white px-3 text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}x {n === 1 ? 'parcela única' : 'parcelas'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#2d251e]">
                    Intervalo
                  </label>
                  <select
                    value={intervalType}
                    onChange={(e) =>
                      setIntervalType(e.target.value as 'monthly' | 'biweekly' | 'weekly')
                    }
                    className="h-11 w-full rounded-xl border border-[#dfd5c4] bg-white px-3 text-sm"
                  >
                    <option value="monthly">Mensal (30 dias)</option>
                    <option value="biweekly">Quinzenal (14 dias)</option>
                    <option value="weekly">Semanal (7 dias)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#2d251e]">
                  Vencimento da 1ª Parcela
                </label>
                <Input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="bg-white h-11 text-sm"
                />
              </div>

              {/* Pré-visualização das Parcelas */}
              {generatedInstallments.length > 0 && (
                <div className="pt-2 border-t border-[#e8ddce] space-y-1.5">
                  <span className="text-[10px] font-bold text-[#766a5e] uppercase tracking-wider">
                    Prévia do Cronograma de Cobrança:
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {generatedInstallments.map((inst) => (
                      <div
                        key={inst.installment_number}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white border border-[#e4dcd0]"
                      >
                        <span className="font-medium text-[#2d251e]">
                          {inst.installment_number}ª parcela
                        </span>
                        <span className="text-[#766a5e]">
                          Vence em {formatDateBR(inst.due_date)}
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
              Confirmar Venda
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
