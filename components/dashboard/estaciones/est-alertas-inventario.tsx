'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, CheckCircle2, Bell, BellOff, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Tanque } from '@/components/dashboard/estaciones/est-tanques';
import type { Producto } from '@/components/dashboard/estaciones/est-productos';

type Alerta = {
  id: string;
  estacion_id: string;
  tanque_id: string | null;
  tipo: string;
  severidad: string;
  mensaje: string;
  valor_actual: number | null;
  umbral: number | null;
  fecha: string;
  atendida: boolean;
  atendida_por: string | null;
  atendida_at: string | null;
};

interface Props {
  estacionId: string;
  estacionNombre: string;
  tanques: Tanque[];
  productos: Producto[];
}

const SEVERIDAD_CONFIG: Record<string, { label: string; cls: string; icon: typeof AlertTriangle }> = {
  critica: { label: 'Crítica', cls: 'bg-red-50 border-red-200 text-red-700', icon: ShieldAlert },
  alta: { label: 'Alta', cls: 'bg-orange-50 border-orange-200 text-orange-700', icon: AlertTriangle },
  media: { label: 'Media', cls: 'bg-amber-50 border-amber-200 text-amber-700', icon: AlertTriangle },
  baja: { label: 'Baja', cls: 'bg-blue-50 border-blue-200 text-blue-700', icon: Bell },
};

const TIPO_CONFIG: Record<string, { label: string; emoji: string }> = {
  bajo_30: { label: 'Nivel bajo (<30%)', emoji: '🟡' },
  bajo_20: { label: 'Nivel bajo (<20%)', emoji: '🟠' },
  critico_10: { label: 'Nivel crítico (<10%)', emoji: '🔴' },
  casi_lleno: { label: 'Tanque casi lleno', emoji: '🔵' },
  error_inventario: { label: 'Posible error de inventario', emoji: '⚠️' },
  consumo_inusual: { label: 'Consumo inusual', emoji: '📊' },
  descarga_superior: { label: 'Descarga superior a capacidad', emoji: '🚛' },
  inventario_negativo: { label: 'Inventario negativo', emoji: '⛔' },
  diferencia_ventas: { label: 'Diferencia entre ventas e inventario', emoji: '🔍' },
};

export function EstAlertasInventario({ estacionId, estacionNombre, tanques, productos }: Props) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'activas' | 'todas'>('activas');

  const fetchAlertas = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('est_alertas_inventario').select('*').eq('estacion_id', estacionId).order('fecha', { ascending: false }).limit(100);
    if (filtro === 'activas') query = query.eq('atendida', false);
    const { data, error } = await query;
    if (error) { toast.error('Error al cargar alertas'); setLoading(false); return; }
    setAlertas((data as Alerta[]) ?? []);
    setLoading(false);
  }, [estacionId, filtro]);

  useEffect(() => { fetchAlertas(); }, [fetchAlertas]);

  // Auto-generate alerts based on current tank levels
  const generarAlertas = async () => {
    if (tanques.length === 0) { toast.error('No hay tanques configurados.'); return; }
    let count = 0;
    for (const t of tanques) {
      const pct = t.capacidad_maxima_galones > 0 ? (t.nivel_actual_galones / t.capacidad_maxima_galones) * 100 : 0;
      let tipo: string | null = null;
      let severidad = 'media';
      let mensaje = '';

      if (pct < 10) { tipo = 'critico_10'; severidad = 'critica'; mensaje = `Tanque "${t.nombre}" en nivel crítico (${pct.toFixed(1)}%)`; }
      else if (pct < 20) { tipo = 'bajo_20'; severidad = 'alta'; mensaje = `Tanque "${t.nombre}" por debajo del 20% (${pct.toFixed(1)}%)`; }
      else if (pct < 30) { tipo = 'bajo_30'; severidad = 'media'; mensaje = `Tanque "${t.nombre}" por debajo del 30% (${pct.toFixed(1)}%)`; }
      else if (pct > 95) { tipo = 'casi_lleno'; severidad = 'baja'; mensaje = `Tanque "${t.nombre}" casi lleno (${pct.toFixed(1)}%)`; }

      if (t.nivel_actual_galones < 0) { tipo = 'inventario_negativo'; severidad = 'critica'; mensaje = `Tanque "${t.nombre}" tiene inventario negativo`; }

      if (tipo) {
        const { data: existing } = await supabase.from('est_alertas_inventario')
          .select('id').eq('estacion_id', estacionId).eq('tanque_id', t.id)
          .eq('tipo', tipo).eq('atendida', false).limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from('est_alertas_inventario').insert({
            estacion_id: estacionId,
            tanque_id: t.id,
            tipo,
            severidad,
            mensaje,
            valor_actual: t.nivel_actual_galones,
            umbral: t.capacidad_maxima_galones * (tipo === 'critico_10' ? 0.1 : tipo === 'bajo_20' ? 0.2 : tipo === 'bajo_30' ? 0.3 : 0.95),
          });
          count++;
        }
      }
    }
    if (count > 0) toast.success(`${count} alerta${count !== 1 ? 's' : ''} generada${count !== 1 ? 's' : ''}.`);
    else toast.info('No hay nuevas alertas. Todo en orden.');
    fetchAlertas();
  };

  const atenderAlerta = async (id: string) => {
    const { error } = await supabase.from('est_alertas_inventario')
      .update({ atendida: true, atendida_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Error al atender alerta.'); return; }
    toast.success('Alerta atendida.');
    fetchAlertas();
  };

  const getTanque = (id: string | null) => tanques.find((t) => t.id === id);
  const getProducto = (id: string | null) => productos.find((p) => p.id === id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Alertas Inteligentes</h2>
          <p className="text-sm text-slate-500">{estacionNombre} — Monitoreo automático de inventario</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={generarAlertas}>
            <Bell className="h-3.5 w-3.5" />Generar alertas
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setFiltro('activas')} className={cn('px-4 py-2 text-sm font-medium transition-colors', filtro === 'activas' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-slate-500 hover:text-slate-700')}>Activas ({alertas.filter((a) => !a.atendida).length})</button>
        <button onClick={() => setFiltro('todas')} className={cn('px-4 py-2 text-sm font-medium transition-colors', filtro === 'todas' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-slate-500 hover:text-slate-700')}>Todas</button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
      ) : alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-300" />
          <p className="mt-4 text-base font-semibold text-slate-600">No hay alertas activas</p>
          <p className="mt-1 text-sm text-slate-400">El inventario está en buen estado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map((a) => {
            const sev = SEVERIDAD_CONFIG[a.severidad] ?? SEVERIDAD_CONFIG.media;
            const tipoCfg = TIPO_CONFIG[a.tipo] ?? { label: a.tipo, emoji: 'ℹ️' };
            const tanque = getTanque(a.tanque_id);
            const prod = getProducto(tanque?.producto_id ?? null);
            const Icon = sev.icon;
            return (
              <Card key={a.id} className={cn('border-l-4', a.atendida ? 'opacity-50' : '', sev.cls.split(' ')[1])}>
                <div className="flex items-start gap-4 p-4">
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', sev.cls)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tipoCfg.label}</p>
                        <p className="mt-0.5 text-sm text-slate-600">{a.mensaje}</p>
                      </div>
                      <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', sev.cls)}>{sev.label}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{new Date(a.fecha).toLocaleString('es-CO')}</span>
                      {tanque && <span>· Tanque: {tanque.nombre}</span>}
                      {prod && <span>· {prod.nombre}</span>}
                      {a.valor_actual !== null && <span>· Actual: {a.valor_actual.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal</span>}
                      {a.umbral !== null && <span>· Umbral: {a.umbral.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal</span>}
                      {a.atendida && <span className="text-emerald-600 font-semibold">· Atendida {a.atendida_at ? new Date(a.atendida_at).toLocaleDateString('es-CO') : ''}</span>}
                    </div>
                  </div>
                  {!a.atendida && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0" onClick={() => atenderAlerta(a.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />Atender
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
