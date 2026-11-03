'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/lib/../components/ui/button';
import { Input } from '@/lib/../components/ui/input';
import { Card, CardContent } from '@/lib/../components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isSignUp, setIsSignUp] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
        } else {
          setSuccessMessage(
            'Conta criada com sucesso! Se a confirmação de e-mail estiver ativa, verifique sua caixa de entrada.'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage('Credenciais inválidas. Verifique seu e-mail e senha.');
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch {
      setErrorMessage('Ocorreu um erro ao conectar ao serviço de autenticação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f0e9df]">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo & Branding */}
        <div className="text-center space-y-2">
          <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-[#977f5a] shadow-md bg-white p-1">
            <Image
              src="/logo.jpg"
              alt="Renata Diller Semijoias"
              width={96}
              height={96}
              className="w-full h-full object-cover rounded-full"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2d251e]">
              Renata Diller
            </h1>
            <p className="text-xs font-semibold tracking-widest text-[#977f5a] uppercase mt-0.5">
              Gestão Financeira
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="shadow-lg border-[#dfd5c4] bg-[#fbf9f6]">
          <CardContent className="pt-5 space-y-4">
            <div className="text-center pb-2">
              <h2 className="text-base font-semibold text-[#2d251e]">
                {isSignUp ? 'Criar Nova Conta' : 'Acesse o Sistema'}
              </h2>
              <p className="text-xs text-[#766a5e]">
                {isSignUp
                  ? 'Informe seu e-mail e senha para começar'
                  : 'Sua sessão ficará salva neste celular'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs rounded-xl bg-red-50 border border-red-200 text-red-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3 text-xs rounded-xl bg-green-50 border border-green-200 text-green-700">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#2d251e] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#977f5a]" /> E-mail
                </label>
                <Input
                  type="email"
                  required
                  placeholder="seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-[#2d251e] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#977f5a]" /> Senha
                </label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-white"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
              </div>

              <Button
                type="submit"
                className="w-full text-base font-semibold shadow-md mt-2"
                size="lg"
                isLoading={loading}
              >
                {isSignUp ? 'Cadastrar' : 'Entrar no Sistema'}
              </Button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-[#977f5a] hover:underline font-medium py-2 px-3"
              >
                {isSignUp
                  ? 'Já tem uma conta? Entrar'
                  : 'Primeiro acesso? Crie sua conta'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
