'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Camila Moreno', role: 'Gerente General', company: 'Tienda La Colmena', initials: 'CM',
    rating: 5, color: 'from-blue-400 to-blue-600',
    text: 'Antes usaba cinco aplicaciones distintas para manejar mi tienda. Con NexoPyme AI lo tengo todo en un solo lugar y la IA me dijo que podía ahorrar $800.000 al mes cambiando un solo proveedor. Increíble.',
  },
  {
    name: 'Ricardo Suárez', role: 'Propietario', company: 'Restaurante El Rincón', initials: 'RS',
    rating: 5, color: 'from-emerald-400 to-emerald-600',
    text: 'El módulo de inventario me avisa automáticamente antes de que se acabe un ingrediente. Ya no tengo pérdidas por falta de stock. Y el asistente IA responde mis preguntas como si tuviera un contador propio.',
  },
  {
    name: 'Valentina Lagos', role: 'Directora Operativa', company: 'Parqueadero Central Norte', initials: 'VL',
    rating: 5, color: 'from-violet-400 to-violet-600',
    text: 'El módulo de parqueadero nos ahorró horas de trabajo manual. Ahora controlamos 80 cupos desde la pantalla, los cobros son automáticos y los reportes se generan solos. La inversión se pagó en el primer mes.',
  },
  {
    name: 'Andrés Jiménez', role: 'CEO', company: 'Distribuidora ElectroPyme', initials: 'AJ',
    rating: 5, color: 'from-amber-400 to-orange-500',
    text: 'Pasamos de manejar la nómina en Excel a tenerla completamente automatizada. El módulo de talento humano nos ahorra dos días de trabajo cada mes y los empleados están más satisfechos con el control de asistencia.',
  },
  {
    name: 'Sofía Quintero', role: 'Administradora', company: 'Clínica Odonto Salud', initials: 'SQ',
    rating: 5, color: 'from-teal-400 to-teal-600',
    text: 'La IA de NexoPyme detectó que teníamos 18% de citas que no se presentaban y nos sugirió un sistema de recordatorios. Implementamos la recomendación y en un mes mejoramos la asistencia de pacientes un 34%.',
  },
  {
    name: 'Miguel Herrera', role: 'Fundador', company: 'MiniMercado FreshPoint', initials: 'MH',
    rating: 5, color: 'from-rose-400 to-rose-600',
    text: 'Llevo seis meses usando NexoPyme AI y mis ventas crecieron un 31%. No porque la plataforma venda por mí, sino porque la IA me muestra exactamente qué productos impulsar, cuándo hacer descuentos y dónde está perdiendo dinero mi negocio.',
  },
];

export function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="testimonios" ref={ref} className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">Testimonios reales</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Empresas que ya crecen con NexoPyme AI
          </h2>
          <p className="mt-5 text-xl text-slate-500">Más de 500 empresas en Latinoamérica han transformado su administración con nuestra plataforma.</p>
        </motion.div>

        {/* Stars average */}
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.3 }}
          className="mt-8 flex items-center justify-center gap-3">
          <div className="flex gap-1">{[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}</div>
          <span className="text-lg font-bold text-slate-900">4.9/5</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500 text-sm">Basado en +200 reseñas verificadas</span>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
              {/* Quote icon */}
              <Quote className="mb-4 h-8 w-8 text-slate-200" />

              {/* Stars */}
              <div className="mb-3 flex gap-1">
                {[...Array(t.rating)].map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
              </div>

              <p className="flex-1 text-sm leading-relaxed text-slate-600">"{t.text}"</p>

              <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-bold text-white`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role} · {t.company}</p>
                </div>
              </div>

              {/* Accent line */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${t.color} opacity-0 transition-opacity group-hover:opacity-100`} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
