'use client';

import {
  Users,
  MessageCircle,
  Send,
  Calendar,
  Video,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const features = [
  {
    icon: Sparkles,
    title: 'Consejos diarios',
    description: 'Recibe tips prácticos cada día para mejorar tu negocio.',
  },
  {
    icon: Video,
    title: 'Sesiones en vivo',
    description: 'Participa en sesiones semanales con expertos y emprendedores.',
  },
  {
    icon: MessageCircle,
    title: 'Resuelve tus dudas',
    description: 'Pregunta y comparte experiencias con otros empresarios.',
  },
];

const upcomingSessions = [
  {
    title: 'Estrategias de venta para fin de año',
    date: '18 Jul 2026',
    time: '18:00',
    host: 'Carlos Méndez',
  },
  {
    title: 'Cómo usar la IA para optimizar inventario',
    date: '25 Jul 2026',
    time: '17:00',
    host: 'Ana Torres',
  },
];

export default function ComunidadPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Comunidad NexoPyme
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Únete a cientos de empresarios que comparten y crecen juntos.
        </p>
      </div>

      {/* Hero card */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-8 sm:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-blue-200">
            <Users className="h-3.5 w-3.5" />
            +500 empresarios activos
          </div>

          <h2 className="mt-5 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Únete a nuestra comunidad
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300">
            Recibe consejos diarios, participa en sesiones en vivo y resuelve
            dudas junto a otros empresarios.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:bg-[#1eb555] hover:shadow-soft-lg"
            >
              <MessageCircle className="h-5 w-5" />
              Unirse por WhatsApp
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="https://t.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all hover:bg-[#1c8bba] hover:shadow-soft-lg"
            >
              <Send className="h-5 w-5" />
              Unirse por Telegram
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </Card>

      {/* Features */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {features.map((f) => (
          <Card
            key={f.title}
            className="p-6 transition-shadow hover:shadow-soft-lg"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              {f.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {f.description}
            </p>
          </Card>
        ))}
      </div>

      {/* Upcoming sessions */}
      <Card className="mt-8 p-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-slate-900">
            Próximas sesiones en vivo
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Reserva tu lugar en las próximas charlas con expertos.
        </p>

        <div className="mt-5 space-y-3">
          {upcomingSessions.map((s) => (
            <div
              key={s.title}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-colors hover:border-primary/20 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-xs font-semibold">
                    {s.date.split(' ')[0]}
                  </span>
                  <span className="text-[10px] uppercase">
                    {s.date.split(' ')[1]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {s.time} · Impartida por {s.host}
                  </p>
                </div>
              </div>
              <button className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-600">
                Reservar
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
