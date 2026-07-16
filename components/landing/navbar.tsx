'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Zap, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Características', href: '#caracteristicas' },
  { label: 'Módulos', href: '#modulos' },
  { label: 'IA Empresarial', href: '#ia' },
  { label: 'Precios', href: '#precios' },
  { label: 'Testimonios', href: '#testimonios' },
  { label: 'Comunidad', href: '#comunidad' },
  { label: 'Contacto', href: '#contacto' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleScroll = (href: string) => {
    setOpen(false);
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-200/60'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 shadow-sm">
              <Zap className="h-4 w-4 text-white fill-white" />
            </div>
            <span className={cn('text-lg font-bold tracking-tight transition-colors', scrolled ? 'text-slate-900' : 'text-white')}>
              NexoPyme <span className="text-blue-500">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => (
              <button key={l.href} onClick={() => handleScroll(l.href)}
                className={cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', scrolled ? 'text-slate-600 hover:text-blue-600 hover:bg-blue-50' : 'text-white/80 hover:text-white hover:bg-white/10')}>
                {l.label}
              </button>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login"
              className={cn('rounded-xl px-4 py-2 text-sm font-medium transition-colors', scrolled ? 'text-slate-700 hover:text-blue-600' : 'text-white/90 hover:text-white')}>
              Iniciar sesión
            </Link>
            <Link href="/registro"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-blue-600/40 hover:-translate-y-0.5">
              Comenzar gratis
            </Link>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setOpen(!open)}
            className={cn('rounded-lg p-2 lg:hidden transition-colors', scrolled ? 'text-slate-600' : 'text-white')}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl lg:hidden">
            <div className="space-y-1 px-4 py-4">
              {NAV_LINKS.map((l) => (
                <button key={l.href} onClick={() => handleScroll(l.href)}
                  className="block w-full rounded-xl px-4 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600">
                  {l.label}
                </button>
              ))}
              <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                <Link href="/login" className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50">Iniciar sesión</Link>
                <Link href="/registro" className="rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">Comenzar gratis</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
