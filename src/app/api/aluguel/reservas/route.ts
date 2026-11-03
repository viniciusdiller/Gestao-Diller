import { NextRequest, NextResponse } from 'next/server';
import { getReservasAction } from '@/app/actions/aluguel-reservas';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const origem = searchParams.get('origem') || undefined;
  const month = searchParams.get('month') || undefined;
  const hospedeId = searchParams.get('hospedeId') || undefined;

  const result = await getReservasAction({ status, origem, month, hospedeId });
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

