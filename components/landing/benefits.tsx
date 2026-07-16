'use client';

import {
  TrendingUp,
  Wallet,
  Package,
  Bot,
  BarChart3,
  Users,
} from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Analiza tus ventas',
    description:
      'Visualiza tus ingresos por producto, canal y periodo. Identifica tendencias y oportunidades de crecimiento.',
  },
  {
    icon: Wallet,
    title: 'Control financiero',
    description:
      'Registra ingresos y gastos, lleva tu flujo de caja al día y mantén las finanzas de tu empresa claras.',
  },
  {
    icon: Package,
    title: 'Gestión de inventario',
    description:
      'Controla el stock de tus productos en tiempo real y recibe alertas automáticas cuando quede poco.',
  },
  {
    icon: Bot,
    title: 'Asistente de IA',
    description:
      'Conversa con una IA que entiende tu negocio y te da recomendaciones personalizadas para decidir mejor.',
  },
  {
    icon: BarChart3,
    title: 'Reportes inteligentes',
    description:
      'Genera reportes automáticos con gráficos claros y métricas clave para presentar o tomar decisiones.',
  },
  {
    icon: Users,
    title: 'Comunidad exclusiva',
    description:
      'Únete a una comunidad de empresarios que comparten experiencias, consejos y mejores prácticas.',
  },
];

export function Benefits() {
  return (
    <section id="beneficios" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary">
            Beneficios
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Todo lo que tu negocio necesita en un solo lugar
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Herramientas potentes diseñadas para micro y pequeñas empresas que
            quieren crecer con datos.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group relative rounded-2xl border border-slate-200/70 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
