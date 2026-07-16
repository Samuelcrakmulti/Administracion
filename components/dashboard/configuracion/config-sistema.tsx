'use client';

import {
  Shield, Lock, Smartphone, Monitor, Clock, AlertTriangle,
  CheckCircle2, Activity, Server, Database, Zap, Download,
  Trash2, RefreshCw, Info, CreditCard, Star,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SectionHeader } from './config-empresa';
import { cn } from '@/lib/utils';

// ── Security Section ───────────────────────────────────────────────────────────
export function ConfigSeguridad() {
  const { user } = useAuth();
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }) : '—';
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('es-CO', { dateStyle: 'long' }) : '—';

  return (
    <div className="space-y-6">
      <SectionHeader icon={<Shield className="h-5 w-5" />} title="Seguridad" description="Controla el acceso y protege tu cuenta" />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado de la cuenta</h3>
        </div>
        <div className="divide-y divide-slate-100 p-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoBox icon={<Clock className="h-4 w-4 text-blue-600" />} label="Último inicio de sesión" value={lastSignIn} color="blue" />
            <InfoBox icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} label="Cuenta creada" value={createdAt} color="emerald" />
            <InfoBox icon={<Monitor className="h-4 w-4 text-slate-600" />} label="Dispositivos activos" value="1 dispositivo" color="slate" />
            <InfoBox icon={<Shield className="h-4 w-4 text-amber-600" />} label="Verificación en 2 pasos" value="No configurada" color="amber" />
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Acciones de seguridad</h3>
        </div>
        <div className="space-y-2 p-6">
          <SecurityAction icon={<Lock className="h-4 w-4" />} label="Cambiar contraseña" description="Actualiza tu contraseña desde la sección Mi cuenta." color="blue" disabled />
          <SecurityAction icon={<Smartphone className="h-4 w-4" />} label="Activar autenticación de dos factores" description="Próximamente disponible en NexoPyme AI." color="amber" comingSoon />
          <SecurityAction icon={<AlertTriangle className="h-4 w-4" />} label="Cerrar todas las sesiones activas" description="Cierra sesión en todos los dispositivos conectados." color="red"
            onClick={async () => { await supabase.auth.signOut({ scope: 'global' }); toast.success('Sesiones cerradas.'); }} />
        </div>
      </Card>
    </div>
  );
}

// ── Suscripcion Section ────────────────────────────────────────────────────────
export function ConfigSuscripcion() {
  const features = ['Dashboard inteligente', 'Finanzas y ventas', 'Inventario', 'Parqueadero Inteligente', 'Reportes con IA', 'Centro Inteligente Gemini', 'Soporte por correo'];
  return (
    <div className="space-y-6">
      <SectionHeader icon={<CreditCard className="h-5 w-5" />} title="Suscripción" description="Tu plan actual y beneficios disponibles" />
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-white to-transparent">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                <h3 className="text-xl font-bold text-slate-900">Plan Emprendedor</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Activo</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Acceso completo a todas las funcionalidades de NexoPyme AI.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">Gratis</p>
              <p className="text-xs text-slate-400">Período de prueba</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />{f}
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button className="gap-2"><Star className="h-4 w-4" />Actualizar plan</Button>
            <Button variant="outline">Ver planes disponibles</Button>
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5 text-center"><p className="text-2xl font-bold text-slate-900">1</p><p className="text-xs text-slate-500">Usuario</p></Card>
        <Card className="p-5 text-center"><p className="text-2xl font-bold text-slate-900">Ilimitado</p><p className="text-xs text-slate-500">Almacenamiento</p></Card>
        <Card className="p-5 text-center"><p className="text-2xl font-bold text-emerald-600">Activo</p><p className="text-xs text-slate-500">Estado</p></Card>
      </div>
    </div>
  );
}

// ── Integrations Section ───────────────────────────────────────────────────────
export function ConfigIntegraciones() {
  const integrations = [
    { name: 'Supabase', desc: 'Base de datos y autenticación', status: 'connected', color: 'emerald', icon: Database },
    { name: 'Google Gemini AI', desc: 'Motor de inteligencia artificial', status: 'connected', color: 'blue', icon: Zap },
    { name: 'WhatsApp Business', desc: 'Notificaciones y chatbot', status: 'available', color: 'slate', icon: Smartphone },
    { name: 'Telegram', desc: 'Bot de alertas y notificaciones', status: 'available', color: 'slate', icon: Smartphone },
    { name: 'Google Drive', desc: 'Respaldos y exportaciones', status: 'available', color: 'slate', icon: Download },
    { name: 'GitHub', desc: 'Control de versiones', status: 'available', color: 'slate', icon: Server },
  ];
  return (
    <div className="space-y-6">
      <SectionHeader icon={<Zap className="h-5 w-5" />} title="Integraciones" description="Conecta NexoPyme AI con tus servicios favoritos" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {integrations.map((i) => (
          <Card key={i.name} className={cn('p-5 transition-all', i.status === 'connected' ? 'border-emerald-200/60 bg-emerald-50/20' : '')}>
            <div className="flex items-start gap-3">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', i.status === 'connected' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                <i.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900">{i.name}</p>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', i.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                    {i.status === 'connected' ? 'Conectado' : 'Disponible'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{i.desc}</p>
              </div>
              <Button variant="outline" size="sm" className={cn('shrink-0', i.status === 'connected' ? 'text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs' : 'text-xs')}>
                {i.status === 'connected' ? 'Desconectar' : 'Conectar'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Sistema Section ────────────────────────────────────────────────────────────
export function ConfigSistema() {
  return (
    <div className="space-y-6">
      <SectionHeader icon={<Server className="h-5 w-5" />} title="Sistema" description="Estado de la plataforma y herramientas de administración" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Versión', value: '1.0.0', color: 'blue' },
          { label: 'Base de datos', value: 'Supabase', color: 'emerald' },
          { label: 'Motor IA', value: 'Gemini', color: 'violet' },
          { label: 'Estado', value: 'Operativo', color: 'emerald' },
        ].map((s) => (
          <Card key={s.label} className="p-4 text-center">
            <p className={cn('text-base font-bold', s.color === 'emerald' ? 'text-emerald-600' : s.color === 'blue' ? 'text-blue-600' : 'text-violet-600')}>{s.value}</p>
            <p className="mt-1 text-xs text-slate-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado de servicios</h3>
        </div>
        <div className="divide-y divide-slate-100 p-2">
          {[
            { name: 'Base de datos Supabase', ok: true },
            { name: 'Autenticación', ok: true },
            { name: 'Google Gemini AI', ok: true },
            { name: 'CDN y almacenamiento', ok: true },
          ].map((s) => (
            <div key={s.name} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-700">{s.name}</span></div>
              <span className={cn('flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', s.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                <span className={cn('h-1.5 w-1.5 rounded-full', s.ok ? 'bg-emerald-500' : 'bg-red-500')} />{s.ok ? 'Operativo' : 'Falla'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Herramientas del sistema</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2">
          {[
            { label: 'Exportar configuración', icon: Download, desc: 'Descarga un JSON con toda tu configuración.' },
            { label: 'Crear respaldo', icon: Database, desc: 'Genera un respaldo de tus datos.' },
            { label: 'Limpiar caché', icon: RefreshCw, desc: 'Limpia datos temporales del navegador.' },
            { label: 'Diagnóstico del sistema', icon: Activity, desc: 'Verifica el estado de todos los servicios.' },
          ].map((a) => (
            <button key={a.label} type="button"
              onClick={() => toast.info(`${a.label} — Próximamente disponible.`)}
              className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><a.icon className="h-4 w-4" /></div>
              <div><p className="text-sm font-medium text-slate-900">{a.label}</p><p className="mt-0.5 text-xs text-slate-500">{a.desc}</p></div>
            </button>
          ))}
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="h-3.5 w-3.5" />
          <span>NexoPyme AI v1.0.0 · Construido con Next.js, Supabase y Gemini AI · 2024</span>
        </div>
      </div>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────────
function InfoBox({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const cm: Record<string, string> = { blue: 'bg-blue-50', emerald: 'bg-emerald-50', slate: 'bg-slate-100', amber: 'bg-amber-50' };
  return (
    <div className={cn('flex items-center gap-3 rounded-xl p-4', cm[color] || 'bg-slate-50')}>
      {icon}
      <div><p className="text-xs text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-900">{value}</p></div>
    </div>
  );
}

function SecurityAction({ icon, label, description, color, disabled, comingSoon, onClick }: { icon: React.ReactNode; label: string; description: string; color: string; disabled?: boolean; comingSoon?: boolean; onClick?: () => void }) {
  const cm: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600' };
  return (
    <button type="button" disabled={disabled || comingSoon} onClick={onClick}
      className={cn('flex w-full items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition-all', !disabled && !comingSoon ? 'hover:border-slate-300 hover:bg-slate-50' : 'opacity-60 cursor-not-allowed')}>
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', cm[color] || 'bg-slate-50 text-slate-600')}>{icon}</div>
      <div className="flex-1"><p className="text-sm font-medium text-slate-900">{label}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p></div>
      {comingSoon && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Próximamente</span>}
    </button>
  );
}
