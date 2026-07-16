'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Brain, User, TrendingUp, Award, Activity } from 'lucide-react';

type Conversation = {
  title: string;
  messages: { role: 'user' | 'ai'; text: string; items?: string[] }[];
};

const CONVERSATIONS: Conversation[] = [
  {
    title: 'Análisis financiero',
    messages: [
      { role: 'user', text: '¿Cuánto dinero gané este mes?' },
      { role: 'ai', text: 'Este mes tu utilidad fue de $5.240.000.', items: ['Las ventas crecieron un 18% respecto al mes anterior.', 'Tus gastos disminuyeron un 6%.', 'Te recomiendo aumentar el stock de café — se agotará en 4 días.'] },
    ],
  },
  {
    title: 'Rendimiento del equipo',
    messages: [
      { role: 'user', text: '¿Qué empleado tuvo mejor rendimiento este mes?' },
      { role: 'ai', text: 'María López fue la empleada más destacada.', items: ['Realizó el mayor número de ventas del mes: 48 transacciones.', 'Su productividad aumentó un 22% comparado con el mes anterior.', 'Lleva 3 meses consecutivos en el top de rendimiento.'] },
    ],
  },
  {
    title: 'Salud empresarial',
    messages: [
      { role: 'user', text: '¿Cómo está mi empresa?' },
      { role: 'ai', text: 'Salud empresarial: 94/100 — Excelente estado.', items: ['Liquidez: Excelente — Caja cubierta por 3 meses.', 'Ventas: Muy buenas — Crecimiento sostenido.', 'Inventario: Óptimo — Rotación eficiente.', 'Rentabilidad: Alta — Margen del 38%.', 'Riesgo: Bajo — Sin alertas críticas activas.'] },
    ],
  },
];

function ChatMessage({ msg, delay }: { msg: Conversation['messages'][number]; delay: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  if (!visible) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {msg.role === 'ai' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
          <Brain className="h-4 w-4 text-white" />
        </div>
      )}
      <div className={`max-w-[80%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm'}`}>
          {msg.text}
        </div>
        {msg.items?.map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 + 0.2 }}
            className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-700 shadow-sm">
            <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
            {item}
          </motion.div>
        ))}
      </div>
      {msg.role === 'user' && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
          <User className="h-4 w-4 text-slate-600" />
        </div>
      )}
    </motion.div>
  );
}

export function AIDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [activeConv, setActiveConv] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setActiveConv((p) => (p + 1) % CONVERSATIONS.length), 6000);
    return () => clearInterval(t);
  }, [inView]);

  const conv = CONVERSATIONS[activeConv];

  return (
    <section id="ia" ref={ref} className="bg-slate-950 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left: content */}
          <motion.div initial={{ opacity: 0, x: -30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7 }}
            className="space-y-6">
            <span className="inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-400">Inteligencia Artificial</span>
            <h2 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Tu empresa habla.<br />
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Nuestra IA la entiende.</span>
            </h2>
            <p className="text-lg leading-relaxed text-slate-400">
              Pregunta lo que quieras sobre tu negocio en lenguaje natural. NexoPyme AI analiza todos tus datos en tiempo real y te responde con información precisa, contextual y accionable.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: TrendingUp, title: 'Análisis financiero', desc: 'Ventas, utilidad y flujo de caja al instante', color: 'text-emerald-400' },
                { icon: Award, title: 'Gestión del equipo', desc: 'Rendimiento, asistencia y productividad', color: 'text-amber-400' },
                { icon: Activity, title: 'Salud empresarial', desc: 'Score de 0 a 100 actualizado en tiempo real', color: 'text-blue-400' },
              ].map((c, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <c.icon className={`mb-3 h-6 w-6 ${c.color}`} />
                  <p className="mb-1 text-sm font-semibold text-white">{c.title}</p>
                  <p className="text-xs text-slate-400">{c.desc}</p>
                </div>
              ))}
            </div>

            {/* Conversation tabs */}
            <div className="flex gap-2 flex-wrap">
              {CONVERSATIONS.map((c, i) => (
                <button key={i} onClick={() => setActiveConv(i)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${activeConv === i ? 'bg-blue-600 text-white' : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                  {c.title}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Right: Chat window */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: 0.2 }}>
            <div className="rounded-2xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 80px rgba(37,99,235,0.15)' }}>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b border-white/10 bg-slate-800 px-5 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">NexoPyme AI</p>
                  <div className="flex items-center gap-1.5">
                    <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs text-emerald-400">Analizando tu empresa…</span>
                  </div>
                </div>
                <div className="ml-auto flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-amber-500/60" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500/60" />
                </div>
              </div>

              {/* Messages */}
              <AnimatePresence mode="wait">
                <motion.div key={activeConv} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col gap-4 p-5 min-h-72">
                  {conv.messages.map((msg, i) => (
                    <ChatMessage key={`${activeConv}-${i}`} msg={msg} delay={i * 800} />
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Input bar */}
              <div className="border-t border-white/10 p-4">
                <div className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3">
                  <input readOnly placeholder="Pregunta cualquier cosa sobre tu empresa…" className="flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-500 focus:outline-none" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600">
                    <Brain className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
