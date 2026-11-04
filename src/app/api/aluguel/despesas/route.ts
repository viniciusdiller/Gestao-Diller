import { NextRequest, NextResponse } from 'next/server';
import { getDespesasAction } from '@/app/actions/aluguel-despesas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || undefined;
  const categoria = searchParams.get('categoria') || undefined;
  const search = searchParams.get('search') || undefined;
  const page = searchParams.get('page')
    ? Math.max(1, parseInt(searchParams.get('page')!, 10))
    : undefined;
  const pageSize = searchParams.get('pageSize')
    ? Math.max(1, parseInt(searchParams.get('pageSize')!, 10))
    : undefined;

  const result = await getDespesasAction({
    month,
    categoria,
    search,
    page,
    pageSize,
  });
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

