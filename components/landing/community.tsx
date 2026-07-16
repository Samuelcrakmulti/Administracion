'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MessageCircle, BookOpen, GraduationCap, Users, Calendar, FileText, Trophy, Newspaper, MessagesSquare, Send } from 'lucide-react';
import Link from 'next/link';

const BENEFITS = [
  { icon: MessageCircle, title: 'Grupo privado WhatsApp', desc: 'Comunidad activa de empresarios compartiendo estrategias y resultados reales.', color: 'text-emerald-600 bg-emerald-50' },
  { icon: Send, title: 'Canal de Telegram', desc: 'Noticias, alertas y contenido exclusivo para miembros de la comunidad NexoPyme.', color: 'text-blue-600 bg-blue-50' },
  { icon: BookOpen, title: 'Biblioteca empresarial', desc: 'Más de 200 recursos, plantillas, guías y casos de estudio actualizados mensualmente.', color: 'text-violet-600 bg-violet-50' },
  { icon: GraduationCap, title: 'Cursos especializados', desc: 'Formación práctica en ventas, finanzas, marketing digital y gestión empresarial.', color: 'text-amber-600 bg-amber-50' },
  { icon: Users, title: 'Mentorías grupales', desc: 'Sesiones en vivo con expertos en administración, tecnología y crecimiento empresarial.', color: 'text-teal-600 bg-teal-50' },
  { icon: Calendar, title: 'Eventos exclusivos', desc: 'Webinars, talleres y encuentros empresariales para expandir tu red de contactos.', color: 'text-rose-600 bg-rose-50' },
  { icon: FileText, title: 'Plantillas descargables', desc: 'Formatos listos para usar de contratos, presupuestos, planes de negocio y mucho más.', color: 'text-indigo-600 bg-indigo-50' },
  { icon: Trophy, title: 'Casos de éxito', desc: 'Aprende de empresas que crecieron con NexoPyme AI: resultados reales y verificados.', color: 'text-orange-600 bg-orange-50' },
  { icon: MessagesSquare, title: 'Foros temáticos', desc: 'Discusiones sobre administración, tecnología, estrategia y crecimiento empresarial.', color: 'text-cyan-600 bg-cyan-50' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export function Community() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="comunidad" ref={ref} className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-600">Comunidad Premium</span>
          <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Nunca administres tu empresa solo
          </h2>
          <p className="mt-5 text-xl text-slate-500 leading-relaxed">
            Al unirte a NexoPyme AI formas parte de una comunidad exclusiva de empresarios que comparten conocimiento, estrategias y experiencias reales.
          </p>
        </motion.div>

        <motion.div variants={container} initial="hidden" animate={inView ? 'show' : 'hidden'}
          className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <motion.div key={i} variants={item}
              className="group flex items-start gap-4 rounded-2xl border border-slate-100 p-5 transition-all hover:border-slate-200 hover:shadow-md hover:-translate-y-1">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${b.color}`}>
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-1 text-sm font-bold text-slate-900">{b.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{b.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/registro" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:-translate-y-0.5">
            Unirme a la comunidad gratis
          </Link>
          <Link href="/dashboard/comunidad" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-8 py-4 text-base font-semibold text-slate-700 transition-all hover:bg-slate-50">
            Explorar recursos
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
