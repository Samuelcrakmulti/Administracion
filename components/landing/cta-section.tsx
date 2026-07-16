'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Play, Zap } from 'lucide-react';
import Link from 'next/link';

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="contacto" ref={ref} className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}} transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-20 text-center shadow-2xl sm:px-16">
          {/* Background decorations */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }}>
              <div className="mb-4 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white">
                  <Zap className="h-4 w-4 fill-white" />
                  Comienza hoy. Sin riesgos.
                </span>
              </div>
            </motion.div>

            <motion.h2 initial={{ opacity: 0, y: 15 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3 }}
              className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Empieza hoy a administrar tu empresa con Inteligencia Artificial
            </motion.h2>

            <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}
              className="mx-auto mt-6 max-w-2xl text-xl text-blue-100">
              Únete a más de 500 empresas que ya toman decisiones más inteligentes con NexoPyme AI. Sin tarjeta de crédito. Configuración en 5 minutos.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/registro"
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-white px-8 py-4 text-base font-bold text-blue-700 shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl">
                Comenzar gratis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <button className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:-translate-y-1">
                <Play className="h-4 w-4 fill-white" />
                Solicitar demostración
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
              className="mt-10 flex flex-wrap justify-center gap-8">
              {['Sin tarjeta de crédito', '14 días de prueba gratis', 'Cancela cuando quieras', 'Soporte incluido'].map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-blue-200">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                  {t}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
