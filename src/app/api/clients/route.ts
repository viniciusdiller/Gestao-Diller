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
        { success: false, error: 'Não autenticado', clients: [] },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSizeParam = searchParams.get('pageSize');
    const pageSize = pageSizeParam ? Math.max(1, parseInt(pageSizeParam, 10)) : undefined;
    const search = searchParams.get('search')?.trim();

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    query = query.order('name', { ascending: true });

    if (pageSize) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data: clients, count, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, clients: [] },
        { status: 500 }
      );
    }

    const totalCount = count ?? (clients?.length || 0);
    const totalPages = pageSize ? Math.ceil(totalCount / pageSize) : 1;

    return NextResponse.json({
      success: true,
      clients: clients || [],
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro interno do servidor';
    return NextResponse.json({ success: false, error: message, clients: [] }, { status: 500 });
  }
}

