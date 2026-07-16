'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { useAuth } from '@/components/auth-provider';
import { Loader2 } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) {
      router.replace('/dashboard');
    }
  }, [loading, session, router]);

  if (loading || session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: form */}
      <div className="flex w-full flex-col px-6 py-8 sm:px-12 lg:w-1/2 lg:px-20">
        <Link href="/" className="inline-flex">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-slate-400">
          © {new Date().getFullYear()} NexoPyme AI. Todos los derechos
          reservados.
        </p>
      </div>

      {/* Right: brand panel */}
      <div className="relative hidden overflow-hidden bg-slate-900 lg:block lg:w-1/2">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]"
          aria-hidden="true"
        />
        <div className="relative flex h-full flex-col justify-center px-20">
          <h2 className="max-w-md text-3xl font-bold leading-tight text-white">
            La inteligencia artificial que ayuda a administrar tu empresa.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
            Controla tus finanzas, ventas e inventario desde un solo lugar y
            recibe recomendaciones inteligentes para hacer crecer tu negocio.
          </p>
          <div className="mt-10 flex items-center gap-6">
            <div>
              <p className="text-2xl font-bold text-white">+500</p>
              <p className="text-sm text-slate-400">Empresas activas</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">+24%</p>
              <p className="text-sm text-slate-400">Crecimiento promedio</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <p className="text-2xl font-bold text-white">4.9★</p>
              <p className="text-sm text-slate-400">Valoración</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
