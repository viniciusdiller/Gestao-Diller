import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              maxAge: 60 * 60 * 24 * 365, // Sessão de longa duração ("Login eterno" no dispositivo)
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            });
          });
        } catch {
          // Ignorado em Server Components puramente de leitura
        }
      },
    },
  });
}
