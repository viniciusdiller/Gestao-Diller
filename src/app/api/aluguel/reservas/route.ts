import { NextRequest, NextResponse } from 'next/server';
import { getReservasAction } from '@/app/actions/aluguel-reservas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const origem = searchParams.get('origem') || undefined;
  const month = searchParams.get('month') || undefined;
  const hospedeId = searchParams.get('hospedeId') || undefined;
  const search = searchParams.get('search') || undefined;
  const page = searchParams.get('page')
    ? Math.max(1, parseInt(searchParams.get('page')!, 10))
    : undefined;
  const pageSize = searchParams.get('pageSize')
    ? Math.max(1, parseInt(searchParams.get('pageSize')!, 10))
    : undefined;

  const result = await getReservasAction({
    status,
    origem,
    month,
    hospedeId,
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

