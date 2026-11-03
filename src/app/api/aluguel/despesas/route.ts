import { NextRequest, NextResponse } from 'next/server';
import { getDespesasAction } from '@/app/actions/aluguel-despesas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || undefined;
  const categoria = searchParams.get('categoria') || undefined;

  const result = await getDespesasAction({ month, categoria });
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

