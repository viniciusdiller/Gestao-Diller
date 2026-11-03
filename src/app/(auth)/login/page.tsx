'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
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
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 antialiased font-sans">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo Diller & Branding Oficial */}
        <div className="text-center space-y-2.5">
          <div className="w-24 h-24 mx-auto rounded-3xl overflow-hidden border border-[#e2e8f0] shadow-sm bg-white p-1 flex items-center justify-center">
            <Image
              src="/diller.jpg"
              alt="Diller-Hub"
              width={96}
              height={96}
              className="w-full h-full object-cover rounded-2xl"
              priority
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">
              Diller-Hub
            </h1>
            <p className="text-xs font-semibold tracking-wider text-[#64748b] uppercase mt-0.5">
              Gestão Integrada de Negócios
            </p>
          </div>
        </div>

        {/* Login Form Card */}
        <Card className="shadow-sm border-[#e2e8f0] bg-white rounded-3xl">
          <CardContent className="pt-6 pb-6 space-y-4">
            <div className="text-center pb-1">
              <h2 className="text-base font-bold text-[#0f172a]">
                {isSignUp ? 'Criar Nova Conta' : 'Acesse sua Conta'}
              </h2>
              <p className="text-xs text-[#64748b] mt-0.5">
                {isSignUp
                  ? 'Informe seu e-mail e senha para começar'
                  : 'Sua sessão ficará salva neste celular'}
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div className="p-3 text-xs rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#64748b]" /> E-mail
                </label>
                <Input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white h-11 border-[#e2e8f0] text-xs focus:ring-1 focus:ring-[#0f172a]"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#0f172a] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#64748b]" /> Senha
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white h-11 pr-10 border-[#e2e8f0] text-xs focus:ring-1 focus:ring-[#0f172a]"
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                    aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full text-sm font-bold shadow-2xs mt-2 bg-[#0f172a] hover:bg-[#1e293b] text-white h-11 rounded-xl active:scale-98 transition-all"
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
                className="text-xs text-[#0f172a] hover:underline font-semibold py-2 px-3 cursor-pointer"
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
