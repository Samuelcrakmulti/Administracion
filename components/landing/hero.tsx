'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, CheckCircle2, TrendingUp, DollarSign, Users, ShoppingCart, Brain, Bell, Star, ArrowUp } from 'lucide-react';

const DASH_DATA = {
  kpis: [
    { label: 'Ventas Mes', value: '$8.4M', change: '+18%', up: true, icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Ingresos', value: '$12.5M', change: '+12%', up: true, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
    { label: 'Clientes', value: '847', change: '+34', up: true, icon: Users, color: 'text-violet-600 bg-violet-50' },
    { label: 'Utilidad', value: '$3.2M', change: '+6%', up: true, icon: ShoppingCart, color: 'text-amber-600 bg-amber-50' },
  ],
  bars: [42, 65, 55, 80, 70, 88, 95, 75, 92, 85, 78, 96],
  months: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
};

function MockDashboard() {
  const [visible, setVisible] = useState(false);
  const [bars, setBars] = useState(DASH_DATA.bars.map(() => 0));

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const delays = DASH_DATA.bars.map((_, i) => setTimeout(() => {
      setBars((prev) => { const n = [...prev]; n[i] = DASH_DATA.bars[i]; return n; });
    }, i * 60));
    return () => delays.forEach(clearTimeout);
  }, [visible]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
      className="relative w-full max-w-[600px] rounded-2xl bg-white shadow-2xl border border-slate-200/60 overflow-hidden"
      style={{ boxShadow: '0 25px 60px rgba(37,99,235,0.18), 0 4px 20px rgba(0,0,0,0.08)' }}
    >
      {/* Dashboard top bar */}
      <div className="flex items-center justify-between bg-slate-900 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
          <span className="ml-3 text-xs font-semibold text-slate-300">NexoPyme AI Dashboard</span>
        </div>
        <div className="flex items-center gap-2">
          <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-medium">En vivo</span>
        </div>
      </div>

      <div className="p-5 space-y-4 bg-slate-50/50">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DASH_DATA.kpis.map((k, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 10 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className="rounded-xl bg-white p-3 shadow-sm border border-slate-100">
              <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${k.color}`}>
                <k.icon className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="mt-0.5 text-base font-bold text-slate-900">{k.value}</p>
              <p className="text-[10px] font-medium text-emerald-600"><ArrowUp className="inline h-2.5 w-2.5" />{k.change}</p>
            </motion.div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-100">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-700">Ventas mensuales</p>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">2024</span>
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  className="w-full rounded-sm bg-gradient-to-t from-blue-600 to-blue-400"
                  style={{ height: `${h}%` }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05, ease: 'easeOut' }}
                />
                <span className="text-[8px] text-slate-400">{DASH_DATA.months[i].slice(0, 1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI suggestion */}
        <motion.div
          initial={{ opacity: 0, x: 10 }} animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : 10 }}
          transition={{ delay: 1.2 }}
          className="flex items-start gap-3 rounded-xl border border-blue-200/60 bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Brain className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-blue-700">IA Empresarial</p>
            <p className="text-[10px] text-slate-600 mt-0.5">El <span className="font-semibold">café premium</span> se agotará en 4 días. Las ventas crecieron <span className="font-semibold text-emerald-600">18%</span> este mes.</p>
          </div>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="shrink-0 mt-1 h-2 w-2 rounded-full bg-blue-500" />
        </motion.div>

        {/* Recent sales */}
        <div className="rounded-xl bg-white p-3 shadow-sm border border-slate-100">
          <p className="mb-2.5 text-xs font-semibold text-slate-700">Actividad reciente</p>
          {[
            { name: 'María López', action: 'Venta #1247', amount: '$245.000', time: '2 min' },
            { name: 'Carlos Ruiz', action: 'Venta #1246', amount: '$180.000', time: '5 min' },
            { name: 'Ana Torres', action: 'Venta #1245', amount: '$320.000', time: '8 min' },
          ].map((item, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -5 }} animate={{ opacity: visible ? 1 : 0, x: visible ? 0 : -5 }}
              transition={{ delay: 0.8 + i * 0.1 }}
              className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[8px] font-bold text-blue-700">{item.name.charAt(0)}</div>
                <div>
                  <p className="text-[10px] font-medium text-slate-800">{item.name}</p>
                  <p className="text-[9px] text-slate-400">{item.action}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-emerald-600">{item.amount}</p>
                <p className="text-[9px] text-slate-400">{item.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <section id="inicio" ref={ref} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 pt-16">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,black,transparent)]" />
      {/* Glows */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[100px]" />
      <div className="absolute top-1/2 right-1/4 h-80 w-80 rounded-full bg-indigo-600/15 blur-[80px]" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          {/* Left content */}
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-300">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" /></span>
                Impulsado por Inteligencia Artificial
              </span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}>
              <h1 className="text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-6xl">
                El primer{' '}
                <span className="bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">
                  Gerente con Inteligencia Artificial
                </span>{' '}
                para tu empresa
              </h1>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg leading-relaxed text-slate-300">
              NexoPyme AI reúne en una sola plataforma todo lo que una micro o pequeña empresa necesita para administrar su negocio. Controla ventas, finanzas, inventario, empleados, parqueadero y mucho más mientras una Inteligencia Artificial analiza tu información y genera recomendaciones para ayudarte a tomar mejores decisiones.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-wrap gap-4">
              <Link href="/registro"
                className="group inline-flex items-center gap-2.5 rounded-2xl bg-blue-600 px-7 py-4 text-base font-semibold text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-500 hover:-translate-y-1 hover:shadow-blue-600/40">
                Comenzar gratis
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <button className="inline-flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-7 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:-translate-y-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <Play className="h-3 w-3 fill-white text-white" />
                </div>
                Ver demostración
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-wrap gap-x-6 gap-y-2">
              {['Sin tarjeta de crédito', 'Configuración en menos de 5 minutos', 'Cancela cuando quieras', 'Soporte especializado'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-sm text-slate-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />{t}
                </span>
              ))}
            </motion.div>

            {/* Social proof */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }}
              className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {['MB', 'CR', 'AT', 'JL', 'SH'].map((i) => (
                  <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-800 bg-gradient-to-br from-blue-400 to-blue-600 text-[10px] font-bold text-white">{i}</div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-slate-400">Más de <span className="font-semibold text-white">500 empresas</span> confían en NexoPyme AI</p>
              </div>
            </motion.div>
          </div>

          {/* Right: Mock Dashboard */}
          <div className="flex justify-center lg:justify-end">
            <MockDashboard />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs text-slate-500">Descubre más</span>
        <div className="flex h-8 w-5 justify-center rounded-full border-2 border-slate-600 pt-1.5">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }}
            className="h-1.5 w-1 rounded-full bg-slate-400" />
        </div>
      </motion.div>
    </section>
  );
}
