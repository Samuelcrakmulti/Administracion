'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Building2, Cpu, AlertTriangle, Lightbulb, CheckCircle2, ArrowDown } from 'lucide-react';

const STEPS = [
  { num: '01', icon: Building2, title: 'Registra tu empresa', desc: 'Crea tu cuenta, ingresa los datos de tu empresa y conecta todos tus módulos en menos de 5 minutos. Sin configuración técnica.', color: 'from-blue-500 to-blue-600' },
  { num: '02', icon: Cpu, title: 'La IA analiza tus datos', desc: 'Google Gemini procesa automáticamente toda la información de ventas, finanzas, inventario y empleados en tiempo real.', color: 'from-violet-500 to-violet-600' },
  { num: '03', icon: AlertTriangle, title: 'Detecta oportunidades y riesgos', desc: 'NexoPyme AI identifica productos agotándose, empleados con bajo rendimiento, gastos excesivos y oportunidades de crecimiento.', color: 'from-amber-500 to-orange-500' },
  { num: '04', icon: Lightbulb, title: 'Genera recomendaciones inteligentes', desc: 'Recibe sugerencias precisas y accionables basadas en los datos reales de tu negocio, en lenguaje natural y claro.', color: 'from-emerald-500 to-teal-500' },
  { num: '05', icon: CheckCircle2, title: 'Tomas mejores decisiones', desc: 'Con información confiable y análisis automatizado, decides con certeza y haces crecer tu empresa de forma sostenida.', color: 'from-rose-500 to-rose-600' },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="como-funciona" ref={ref} className="bg-slate-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">¿Cómo funciona?</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            De los datos a las decisiones en segundos
          </h2>
          <p className="mt-5 text-xl text-slate-500">Un proceso automático que convierte la información de tu empresa en ventajas competitivas reales.</p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-0 lg:grid-cols-5">
          {STEPS.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center">
              {/* Step card */}
              <motion.div
                initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="group flex w-full flex-col items-center text-center px-4 py-6">
                {/* Icon circle */}
                <div className={`relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} text-white shadow-lg`}>
                  <step.icon className="h-7 w-7" />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm border border-slate-100">{step.num}</span>
                </div>
                <h3 className="mb-2 text-base font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{step.desc}</p>
              </motion.div>

              {/* Arrow between steps (desktop) */}
              {i < STEPS.length - 1 && (
                <div className="absolute top-14 right-0 hidden translate-x-1/2 lg:flex items-center justify-center z-10">
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.4, delay: i * 0.12 + 0.3 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md border border-slate-200">
                    <ArrowDown className="h-4 w-4 rotate-[-90deg] text-blue-500" />
                  </motion.div>
                </div>
              )}

              {/* Arrow between steps (mobile) */}
              {i < STEPS.length - 1 && (
                <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: i * 0.12 + 0.2 }}
                  className="flex items-center justify-center py-2 lg:hidden">
                  <ArrowDown className="h-5 w-5 text-blue-400" />
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
