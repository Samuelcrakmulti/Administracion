'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Brain, DollarSign, TrendingUp, Package, Users, Car, BarChart2, Smartphone, Zap } from 'lucide-react';

const FEATURES = [
  { icon: Brain, title: 'IA Empresarial', desc: 'Diagnósticos automáticos, predicciones y recomendaciones generadas por Gemini AI en tiempo real.', color: 'from-blue-500 to-blue-700', bg: 'bg-blue-50', text: 'text-blue-600' },
  { icon: DollarSign, title: 'Finanzas', desc: 'Control total de ingresos, gastos, flujo de caja y análisis financiero automatizado.', color: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { icon: TrendingUp, title: 'Ventas', desc: 'Registro, seguimiento y análisis de cada venta con métricas de rendimiento y comisiones.', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600' },
  { icon: Package, title: 'Inventario', desc: 'Control de stock, alertas de agotamiento, valoración y gestión de proveedores.', color: 'from-violet-500 to-violet-700', bg: 'bg-violet-50', text: 'text-violet-600' },
  { icon: Users, title: 'Gestión del Talento', desc: 'Empleados, turnos, asistencia, nómina y vacaciones integrados con IA de RRHH.', color: 'from-teal-500 to-teal-700', bg: 'bg-teal-50', text: 'text-teal-600' },
  { icon: Car, title: 'Parqueadero Inteligente', desc: 'Control de ingresos/salidas, tarifas automáticas y estadísticas del parqueadero.', color: 'from-slate-600 to-slate-800', bg: 'bg-slate-100', text: 'text-slate-700' },
  { icon: BarChart2, title: 'Reportes', desc: 'Informes ejecutivos, financieros y operativos con exportación en PDF, Excel y CSV.', color: 'from-rose-500 to-rose-700', bg: 'bg-rose-50', text: 'text-rose-600' },
  { icon: Smartphone, title: 'Comunidad Premium', desc: 'Grupo exclusivo, biblioteca empresarial, mentorías y casos de éxito de otras empresas.', color: 'from-indigo-500 to-indigo-700', bg: 'bg-indigo-50', text: 'text-indigo-600' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };

export function WhyNexoPyme() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="caracteristicas" ref={ref} className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">¿Por qué NexoPyme AI?</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Todo tu negocio en un solo lugar
          </h2>
          <p className="mt-5 text-xl text-slate-500 leading-relaxed">
            Deja de usar múltiples aplicaciones. Con NexoPyme AI administras todas las áreas de tu empresa desde una sola plataforma inteligente.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div variants={container} initial="hidden" animate={inView ? 'show' : 'hidden'}
          className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div key={i} variants={item}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-slate-200">
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 transition-opacity duration-300 group-hover:opacity-5`} />

              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${f.bg}`}>
                <f.icon className={`h-6 w-6 ${f.text}`} />
              </div>
              <h3 className="mb-2 text-base font-bold text-slate-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>

              {/* Bottom accent */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${f.color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
            </motion.div>
          ))}
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 grid grid-cols-2 gap-6 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-800 p-8 md:grid-cols-4">
          {[
            { value: '500+', label: 'Empresas activas' },
            { value: '9', label: 'Módulos integrados' },
            { value: '99.9%', label: 'Tiempo de actividad' },
            { value: '24/7', label: 'IA siempre activa' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-4xl font-extrabold text-white">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-blue-200">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
