'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Building2, Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RegistroPage() {
  const router = useRouter();
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(
        signUpError.message.includes('already registered')
          ? 'Este correo ya está registrado. Intenta iniciar sesión.'
          : signUpError.message
      );
      setLoading(false);
      return;
    }

    // Create empresa row for the new user
    if (data.user) {
      const { error: insertError } = await supabase
        .from('empresas')
        .insert({ nombre: nombreEmpresa });

      if (insertError) {
        // Non-fatal: user account is created, just log it
        console.error('Error creating empresa:', insertError.message);
      }
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Crear cuenta
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Empieza a administrar tu negocio con inteligencia artificial.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Nombre de tu empresa
          </label>
          <div className="relative mt-1.5">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={nombreEmpresa}
              onChange={(e) => setNombreEmpresa(e.target.value)}
              placeholder="Mi Empresa S.A."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Correo electrónico</label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Contraseña</label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label="Mostrar contraseña"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-blue-600 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        ¿Ya tienes una cuenta?{' '}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
