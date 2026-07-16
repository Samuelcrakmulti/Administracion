'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check, X, Zap, Building2, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const PLANS = [
  {
    name: 'Gratuito', subtitle: 'Ideal para comenzar', price: '$0', period: '/mes', cta: 'Comenzar gratis', href: '/registro',
    color: 'border-slate-200', badge: null, popular: false,
    features: [
      { text: 'Dashboard básico', ok: true },
      { text: 'Módulo de Finanzas', ok: true },
      { text: 'Módulo de Ventas', ok: true },
      { text: 'Inventario (hasta 50 productos)', ok: true },
      { text: 'Asistente IA (10 consultas/mes)', ok: true },
      { text: 'Parqueadero Inteligente', ok: false },
      { text: 'Gestión de Talento Humano', ok: false },
      { text: 'Reportes avanzados', ok: false },
      { text: 'Soporte prioritario', ok: false },
      { text: 'Acceso a comunidad premium', ok: false },
    ],
  },
  {
    name: 'Profesional', subtitle: 'Para empresas en crecimiento', price: '$79.000', period: '/mes', cta: 'Iniciar prueba gratis', href: '/registro',
    color: 'border-blue-500', badge: 'Más popular', popular: true,
    features: [
      { text: 'Todo del plan Gratuito', ok: true },
      { text: 'Parqueadero Inteligente', ok: true },
      { text: 'Gestión de Talento Humano', ok: true },
      { text: 'Inventario ilimitado', ok: true },
      { text: 'Asistente IA ilimitado', ok: true },
      { text: 'Reportes avanzados y exportación', ok: true },
      { text: 'Comunidad Premium', ok: true },
      { text: 'Soporte por chat y correo', ok: true },
      { text: 'Múltiples usuarios (hasta 5)', ok: true },
      { text: 'Integraciones avanzadas', ok: false },
    ],
  },
  {
    name: 'Empresarial', subtitle: 'Para negocios que buscan escalar', price: '$199.000', period: '/mes', cta: 'Hablar con ventas', href: '/registro',
    color: 'border-slate-200', badge: null, popular: false,
    features: [
      { text: 'Todo del plan Profesional', ok: true },
      { text: 'Usuarios ilimitados', ok: true },
      { text: 'Integraciones personalizadas', ok: true },
      { text: 'API de acceso', ok: true },
      { text: 'Dashboard personalizado', ok: true },
      { text: 'Capacitación del equipo', ok: true },
      { text: 'Gerente de cuenta dedicado', ok: true },
      { text: 'SLA de uptime 99.9%', ok: true },
      { text: 'Módulos a medida', ok: true },
      { text: 'Soporte 24/7 prioritario', ok: true },
    ],
  },
];

export function Plans() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="precios" ref={ref} className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">Planes y precios</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Elige el plan perfecto para tu empresa</h2>
          <p className="mt-5 text-xl text-slate-500">Comienza gratis y escala cuando tu empresa lo necesite. Sin contratos de permanencia.</p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
          {PLANS.map((plan, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-3xl border-2 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${plan.color} ${plan.popular ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
                    <Star className="h-3 w-3 fill-white" />{plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{plan.subtitle}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3">
                    {f.ok ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <X className="h-4 w-4 shrink-0 text-slate-300" />}
                    <span className={`text-sm ${f.ok ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href}
                className={`group flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold transition-all hover:-translate-y-0.5 ${plan.popular ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700' : 'border-2 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600'}`}>
                {plan.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-slate-400">
          Todos los precios en pesos colombianos (COP). IVA no incluido. Precios pueden cambiar.
        </motion.p>
      </div>
    </section>
  );
}
