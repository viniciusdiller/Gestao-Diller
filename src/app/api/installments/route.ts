import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado', installments: [] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeParam = searchParams.get('pageSize');
    const pageSize = pageSizeParam ? Math.max(1, parseInt(pageSizeParam, 10)) : undefined;
    const status = searchParams.get('status')?.trim();
    const clientId = searchParams.get('clientId')?.trim();

    let query = supabase
      .from('installments')
      .select(
        `
        id,
        sale_id,
        client_id,
        installment_number,
        total_installments,
        amount,
        due_date,
        status,
        paid_at,
        paid_amount,
        payment_method,
        notes,
        clients (
          id,
          name,
          phone
        ),
        sales (
          id,
          description
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    query = query.order('due_date', { ascending: true });

    if (pageSize) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, installments: [] },
        { status: 500 }
      );
    }

    const totalCount = count ?? (data?.length || 0);
    const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

    return NextResponse.json({
      success: true,
      installments: data || [],
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json(
      { success: false, error: message, installments: [] },
      { status: 500 }
    );
  }
}
