import { NextResponse } from 'next/server';
import { getAluguelDashboardDataAction } from '@/app/actions/aluguel-dashboard';

export async function GET() {
  const result = await getAluguelDashboardDataAction();
  return NextResponse.json(result, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

