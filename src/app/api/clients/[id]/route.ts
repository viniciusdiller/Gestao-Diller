import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 });
    }

    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (clientErr || !client) {
      return NextResponse.json(
        { success: false, error: 'Cliente não encontrada.' },
        { status: 404 }
      );
    }

    const [{ data: sales }, { data: installments }] = await Promise.all([
      supabase
        .from('sales')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false }),
      supabase
        .from('installments')
        .select('*')
        .eq('client_id', clientId)
        .eq('user_id', user.id)
        .order('due_date', { ascending: true }),
    ]);

    const validSales = (sales || []).filter((s) => s.status !== 'cancelled');
    const totalSpent = validSales.reduce((acc, s) => acc + Number(s.total_amount), 0);

    const methodCounts: Record<string, number> = {};
    validSales.forEach((s) => {
      methodCounts[s.payment_method] = (methodCounts[s.payment_method] || 0) + 1;
    });
    let mostFrequentPaymentMethod = 'Nenhum';
    let maxCount = 0;
    for (const [method, count] of Object.entries(methodCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostFrequentPaymentMethod = method;
      }
    }

    const pendingInstallments = (installments || []).filter((i) => i.status === 'pending');
    const outstandingBalance = pendingInstallments.reduce((acc, i) => acc + Number(i.amount), 0);

    return NextResponse.json({
      success: true,
      client,
      sales: sales || [],
      installments: installments || [],
      totalSpent,
      mostFrequentPaymentMethod,
      outstandingBalance,
      salesCount: validSales.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

