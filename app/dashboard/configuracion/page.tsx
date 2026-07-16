'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Building2, User, CreditCard, Palette, Bell, Brain, DollarSign,
  Package, ParkingSquare, BarChart2, Shield, Zap, Server,
  ChevronRight, Settings, Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { ConfigEmpresa } from '@/components/dashboard/configuracion/config-empresa';
import { ConfigCuenta } from '@/components/dashboard/configuracion/config-cuenta';
import { ConfigIA } from '@/components/dashboard/configuracion/config-ia';
import { ConfigNotificaciones } from '@/components/dashboard/configuracion/config-notificaciones';
import { ConfigApariencia } from '@/components/dashboard/configuracion/config-apariencia';
import { ConfigModulos } from '@/components/dashboard/configuracion/config-modulos';
import { ParqConfiguracion } from '@/components/dashboard/parqueadero/parq-configuracion';
import {
  ConfigSeguridad, ConfigSuscripcion, ConfigIntegraciones, ConfigSistema,
} from '@/components/dashboard/configuracion/config-sistema';

type SectionKey =
  | 'empresa' | 'cuenta' | 'suscripcion' | 'apariencia' | 'notificaciones'
  | 'ia' | 'finanzas' | 'inventario' | 'parqueadero' | 'reportes'
  | 'seguridad' | 'integraciones' | 'sistema';

type NavGroup = {
  label: string;
  items: { key: SectionKey; label: string; icon: typeof Settings }[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [
      { key: 'empresa', label: 'Empresa', icon: Building2 },
      { key: 'cuenta', label: 'Mi cuenta', icon: User },
      { key: 'suscripcion', label: 'Suscripción', icon: CreditCard },
      { key: 'apariencia', label: 'Apariencia', icon: Palette },
      { key: 'notificaciones', label: 'Notificaciones', icon: Bell },
    ],
  },
  {
    label: 'Módulos',
    items: [
      { key: 'ia', label: 'Inteligencia Artificial', icon: Brain },
      { key: 'finanzas', label: 'Finanzas', icon: DollarSign },
      { key: 'inventario', label: 'Inventario', icon: Package },
      { key: 'parqueadero', label: 'Parqueadero', icon: ParkingSquare },
      { key: 'reportes', label: 'Reportes', icon: BarChart2 },
    ],
  },
  {
    label: 'Avanzado',
    items: [
      { key: 'seguridad', label: 'Seguridad', icon: Shield },
      { key: 'integraciones', label: 'Integraciones', icon: Zap },
      { key: 'sistema', label: 'Sistema', icon: Server },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const [active, setActive] = useState<SectionKey>('empresa');
  const [loading, setLoading] = useState(true);
  const [userSettings, setUserSettings] = useState<Record<string, unknown>>({});
  const [parqConfig, setParqConfig] = useState<null | {
    id?: string; total_cupos: number; tiempo_gracia_min: number;
    iva_pct: number; horario_apertura: string; horario_cierre: string;
  }>(null);
  const [parqTarifas, setParqTarifas] = useState<{ tipo_vehiculo: string; tarifa_primera_hora: number; tarifa_hora_adicional: number; tarifa_maxima_dia: number }[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: us }, { data: pc }, { data: pt }] = await Promise.all([
      supabase.from('user_settings').select('settings').maybeSingle(),
      supabase.from('parqueadero_config').select('*').maybeSingle(),
      supabase.from('parqueadero_tarifas').select('*'),
    ]);
    setUserSettings((us?.settings as Record<string, unknown>) ?? {});
    if (pc) setParqConfig(pc as typeof parqConfig);
    setParqTarifas(pt ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveSettings = useCallback(async (key: string, value: unknown) => {
    const next = { ...(userSettings as Record<string, unknown>), [key]: value };
    setUserSettings(next);
    const existing = await supabase.from('user_settings').select('id').maybeSingle();
    if (existing.data) {
      await supabase.from('user_settings').update({ settings: next, updated_at: new Date().toISOString() }).eq('id', existing.data.id);
    } else {
      await supabase.from('user_settings').insert({ settings: next });
    }
  }, [userSettings]);

  const currentNav = NAV_GROUPS.flatMap((g) => g.items).find((i) => i.key === active);

  const renderSection = () => {
    const s = userSettings as Record<string, Record<string, unknown>>;
    switch (active) {
      case 'empresa': return <ConfigEmpresa onRefresh={loadData} />;
      case 'cuenta': return <ConfigCuenta />;
      case 'suscripcion': return <ConfigSuscripcion />;
      case 'apariencia': return <ConfigApariencia settings={s.apariencia ?? {}} onSave={saveSettings} />;
      case 'notificaciones': return <ConfigNotificaciones settings={s.notifications ?? {}} onSave={saveSettings} />;
      case 'ia': return <ConfigIA settings={s.ai ?? {}} onSave={saveSettings} />;
      case 'finanzas': return <ConfigModulos settings={s} onSave={saveSettings} />;
      case 'inventario': return <ConfigModulos settings={s} onSave={saveSettings} />;
      case 'parqueadero': return <ParqConfiguracion config={parqConfig} tarifas={parqTarifas} onSaved={loadData} />;
      case 'reportes': return <ConfigModulos settings={s} onSave={saveSettings} />;
      case 'seguridad': return <ConfigSeguridad />;
      case 'integraciones': return <ConfigIntegraciones />;
      case 'sistema': return <ConfigSistema />;
      default: return null;
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Centro de Configuración</h1>
          <p className="text-sm text-slate-500">Personaliza NexoPyme AI completamente desde aquí</p>
        </div>
      </div>

      {/* Mobile tab scroll */}
      <div className="mb-6 overflow-x-auto lg:hidden">
        <div className="flex gap-2 pb-1">
          {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
            <button key={item.key} onClick={() => setActive(item.key)}
              className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all', active === item.key ? 'bg-primary text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
              <item.icon className="h-3.5 w-3.5" />{item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="space-y-5 sticky top-6">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button key={item.key} onClick={() => setActive(item.key)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
                        active === item.key ? 'bg-primary/10 font-semibold text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
                      <item.icon className={cn('h-4 w-4 shrink-0', active === item.key ? 'text-primary' : 'text-slate-400')} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {active === item.key && <ChevronRight className="h-3.5 w-3.5 text-primary/60" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content panel */}
        <main className="min-w-0 flex-1">
          {/* Breadcrumb */}
          <div className="mb-6 flex items-center gap-2 text-xs text-slate-400">
            <Settings className="h-3.5 w-3.5" />
            <span>Configuración</span>
            {currentNav && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-slate-600">{currentNav.label}</span>
              </>
            )}
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <div className="animate-in fade-in duration-200">
              {renderSection()}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
