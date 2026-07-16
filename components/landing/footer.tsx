'use client';

import Link from 'next/link';
import { Zap, Instagram, Twitter, Linkedin, Youtube, Mail, MessageCircle, Send, ArrowRight } from 'lucide-react';

const COLUMNS = [
  {
    title: 'Producto',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Finanzas', href: '/dashboard/finanzas' },
      { label: 'Ventas', href: '/dashboard/ventas' },
      { label: 'Inventario', href: '/dashboard/inventario' },
      { label: 'Talento Humano', href: '/dashboard/talento' },
      { label: 'Parqueadero', href: '/dashboard/parqueadero' },
      { label: 'Reportes', href: '/dashboard/reportes' },
      { label: 'Asistente IA', href: '/dashboard/asistente' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Acerca de nosotros', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Casos de éxito', href: '#' },
      { label: 'Prensa', href: '#' },
      { label: 'Empleos', href: '#' },
      { label: 'Socios', href: '#' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Documentación', href: '#' },
      { label: 'Guías de inicio', href: '#' },
      { label: 'Comunidad', href: '/dashboard/comunidad' },
      { label: 'Webinars', href: '#' },
      { label: 'Plantillas', href: '#' },
      { label: 'Estado del servicio', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos de uso', href: '#' },
      { label: 'Política de privacidad', href: '#' },
      { label: 'Política de cookies', href: '#' },
      { label: 'GDPR', href: '#' },
      { label: 'Seguridad', href: '#' },
    ],
  },
];

const SOCIAL = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter/X', href: '#' },
  { icon: Linkedin, label: 'LinkedIn', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
];

export function Footer() {
  return (
    <footer id="footer" className="bg-slate-950 text-slate-300">
      {/* Newsletter bar */}
      <div className="border-b border-white/10 bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold text-white">Recibe novedades de NexoPyme AI</p>
              <p className="text-sm text-slate-400">Estrategias empresariales, nuevas funciones y recursos exclusivos.</p>
            </div>
            <div className="flex gap-2 sm:shrink-0">
              <input type="email" placeholder="tu@empresa.com"
                className="min-w-52 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
                Suscribir <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700">
                <Zap className="h-5 w-5 text-white fill-white" />
              </div>
              <span className="text-lg font-bold text-white">NexoPyme <span className="text-blue-400">AI</span></span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              El primer Gerente con Inteligencia Artificial para micro y pequeñas empresas en Latinoamérica.
            </p>

            {/* Contact */}
            <div className="mt-5 space-y-2">
              <a href="mailto:hola@nexopyme.ai" className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
                <Mail className="h-4 w-4 shrink-0" />hola@nexopyme.ai
              </a>
              <a href="#" className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
                <MessageCircle className="h-4 w-4 shrink-0" />WhatsApp Business
              </a>
              <a href="#" className="flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white">
                <Send className="h-4 w-4 shrink-0" />Telegram
              </a>
            </div>

            {/* Social links */}
            <div className="mt-5 flex gap-2">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-all hover:bg-blue-600 hover:text-white">
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-slate-400 transition-colors hover:text-white">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">© 2024 NexoPyme AI. Todos los derechos reservados. Hecho con en Latinoamérica.</p>
          <div className="flex flex-wrap gap-4">
            {['Términos', 'Privacidad', 'Cookies', 'Seguridad'].map((t) => (
              <a key={t} href="#" className="text-sm text-slate-500 transition-colors hover:text-slate-300">{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
