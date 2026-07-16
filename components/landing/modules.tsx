'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { DollarSign, TrendingUp, Package, Users, Car, BarChart2, Settings, Smartphone, Brain, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const MODULES = [
  {
    icon: DollarSign, title: 'Finanzas', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600',
    desc: 'Control financiero completo con análisis de ingresos, gastos y flujo de caja en tiempo real.',
    features: ['Registro de ingresos y gastos', 'Análisis de flujo de caja', 'Movimientos de caja', 'Reportes financieros', 'Integración con ventas'],
  },
  {
    icon: TrendingUp, title: 'Ventas', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600',
    desc: 'Gestión completa del proceso comercial con seguimiento de clientes y análisis de rendimiento.',
    features: ['Registro de ventas rápido', 'Gestión de clientes', 'Múltiples métodos de pago', 'Comisiones por vendedor', 'Historial completo'],
  },
  {
    icon: Package, title: 'Inventario', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600',
    desc: 'Control de stock inteligente con alertas automáticas de reabastecimiento y valoración.',
    features: ['Control de stock', 'Alertas de agotamiento', 'Múltiples categorías', 'Código de productos', 'Valoración FIFO/LIFO'],
  },
  {
    icon: Users, title: 'Talento Humano', color: 'from-teal-500 to-emerald-600', bg: 'bg-teal-50', text: 'text-teal-600',
    desc: 'Plataforma completa de RRHH con nómina, asistencia, turnos y IA de recursos humanos.',
    features: ['Ficha de empleados', 'Control de asistencia', 'Calendario de turnos', 'Nómina automática', 'Gestión de vacaciones'],
  },
  {
    icon: Car, title: 'Parqueadero', color: 'from-slate-600 to-slate-800', bg: 'bg-slate-100', text: 'text-slate-700',
    desc: 'Administración inteligente de parqueadero con tarifas dinámicas e integración financiera.',
    features: ['Registro de vehículos', 'Cálculo automático de tarifa', 'Múltiples tipos de vehículo', 'Integración con finanzas', 'Estadísticas de ocupación'],
  },
  {
    icon: BarChart2, title: 'Reportes', color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', text: 'text-rose-600',
    desc: 'Informes ejecutivos y operativos con análisis de IA y exportación en múltiples formatos.',
    features: ['Reporte ejecutivo IA', 'Reporte financiero', 'Reporte de ventas', 'Exportar PDF/Excel/CSV', 'Análisis comparativo'],
  },
  {
    icon: Brain, title: 'Asistente IA', color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-600',
    desc: 'Tu propio analista empresarial con Gemini AI que responde preguntas y genera diagnósticos.',
    features: ['Chat inteligente', 'Diagnóstico automático', 'Predicciones de negocio', 'Alertas inteligentes', 'Recomendaciones en tiempo real'],
  },
  {
    icon: Settings, title: 'Configuración', color: 'from-cyan-500 to-blue-600', bg: 'bg-cyan-50', text: 'text-cyan-600',
    desc: 'Centro de administración completo para personalizar todos los aspectos de la plataforma.',
    features: ['Perfil de empresa', 'Configuración de módulos', 'Personalización visual', 'Gestión de usuarios', 'Integraciones'],
  },
  {
    icon: Smartphone, title: 'Comunidad', color: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50', text: 'text-indigo-600',
    desc: 'Red exclusiva de empresarios con recursos, mentorías y casos de éxito del mundo real.',
    features: ['Red de empresarios', 'Biblioteca empresarial', 'Mentorías grupales', 'Plantillas descargables', 'Noticias del sector'],
  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };

export function ModulesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="modulos" ref={ref} className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">Módulos completos</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Una plataforma. Nueve módulos. Todo integrado.
          </h2>
          <p className="mt-5 text-xl text-slate-500">Cada módulo está conectado entre sí y con la Inteligencia Artificial para darte una visión completa de tu empresa.</p>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate={inView ? 'show' : 'hidden'}
          className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <motion.div key={i} variants={item}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-slate-200">
              {/* Top gradient accent */}
              <div className={`h-1 w-full bg-gradient-to-r ${m.color}`} />

              <div className="flex flex-1 flex-col p-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${m.bg}`}>
                  <m.icon className={`h-6 w-6 ${m.text}`} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{m.title}</h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">{m.desc}</p>

                <ul className="mb-5 flex-1 space-y-2">
                  {m.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />{f}
                    </li>
                  ))}
                </ul>

                <Link href="/registro"
                  className={`group/btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${m.color} px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 hover:shadow-md`}>
                  Ver módulo <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
