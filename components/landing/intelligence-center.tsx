'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, DollarSign, Package, Users, Car, Award, AlertTriangle, Sparkles } from 'lucide-react';

const INDICATORS = [
  { icon: TrendingUp, label: 'Predicción de ventas', value: '+22% próx. mes', color: 'text-emerald-600 bg-emerald-50', detail: 'Basado en tendencias de los últimos 90 días' },
  { icon: DollarSign, label: 'Predicción de flujo de caja', value: '$18.4M esperado', color: 'text-blue-600 bg-blue-50', detail: 'Proyección para los próximos 30 días' },
  { icon: Package, label: 'Productos próximos a agotarse', value: '3 productos', color: 'text-amber-600 bg-amber-50', detail: 'Café Premium, Azúcar, Leche — menos de 5 días' },
  { icon: Users, label: 'Clientes inactivos', value: '24 clientes', color: 'text-violet-600 bg-violet-50', detail: 'Sin compras en los últimos 30 días' },
  { icon: Car, label: 'Ocupación del parqueadero', value: '78% en hora pico', color: 'text-slate-700 bg-slate-100', detail: 'Máxima demanda entre 8:00–10:00 AM' },
  { icon: Award, label: 'Productividad del equipo', value: '91% promedio', color: 'text-teal-600 bg-teal-50', detail: 'Equipo por encima de la meta mensual' },
  { icon: AlertTriangle, label: 'Riesgos financieros detectados', value: '1 alerta activa', color: 'text-rose-600 bg-rose-50', detail: 'Gasto operativo aumentó un 14% este mes' },
  { icon: Sparkles, label: 'Recomendaciones generadas', value: '7 esta semana', color: 'text-indigo-600 bg-indigo-50', detail: 'Acciones concretas para mejorar rentabilidad' },
];

export function IntelligenceCenter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="centro-ia" ref={ref} className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7 }}
            className="space-y-6">
            <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">Centro de Inteligencia Empresarial</span>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Tu empresa habla.<br />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Nuestra IA la entiende.</span>
            </h2>
            <p className="text-lg leading-relaxed text-slate-500">
              NexoPyme AI procesa constantemente todos los datos de tu empresa y genera predicciones, alertas y recomendaciones de forma completamente automática — sin que tengas que pedirlas.
            </p>

            <div className="space-y-3">
              {['Análisis continuo 24/7 sin intervención manual', 'Predicciones basadas en tus propios datos históricos', 'Alertas proactivas antes de que los problemas escalen', 'Recomendaciones en lenguaje natural, no en tecnicismos'].map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{t}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Indicators grid */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.2 }}>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Panel de Inteligencia</p>
                  <p className="text-xs text-slate-400">Actualizado hace 2 minutos</p>
                </div>
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                  className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-emerald-600">En vivo</span>
                </motion.div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {INDICATORS.map((ind, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, scale: 0.95 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    className="group rounded-2xl border border-slate-100 p-3.5 transition-all hover:border-slate-200 hover:shadow-md">
                    <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${ind.color}`}>
                      <ind.icon className="h-4 w-4" />
                    </div>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight">{ind.label}</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{ind.value}</p>
                    <p className="mt-1 text-[10px] text-slate-400 leading-tight">{ind.detail}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
