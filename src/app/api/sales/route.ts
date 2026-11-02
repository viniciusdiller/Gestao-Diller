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
        { success: false, error: 'Não autenticado', sales: [] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeParam = searchParams.get('pageSize');
    const pageSize = pageSizeParam ? Math.max(1, parseInt(pageSizeParam, 10)) : undefined;
    const search = searchParams.get('search')?.trim();
    const paymentMethod = searchParams.get('paymentMethod')?.trim();

    let query = supabase
      .from('sales')
      .select(
        `
        id,
        description,
        total_amount,
        payment_method,
        status,
        sale_date,
        clients (
          id,
          name,
          phone
        )
      `,
        { count: 'exact' }
      )
      .eq('user_id', user.id);

    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod);
    }

    if (search) {
      query = query.ilike('description', `%${search}%`);
    }

    query = query.order('sale_date', { ascending: false });

    if (pageSize) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data: sales, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, sales: [] },
        { status: 500 }
      );
    }

    const totalCount = count ?? (sales?.length || 0);
    const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

    return NextResponse.json({
      success: true,
      sales: sales || [],
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ success: false, error: message, sales: [] }, { status: 500 });
  }
}
