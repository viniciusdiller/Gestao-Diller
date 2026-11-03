import { NextResponse } from 'next/server';
import { getHospedesAction } from '@/app/actions/aluguel-hospedes';

export async function GET() {
  const result = await getHospedesAction();
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
