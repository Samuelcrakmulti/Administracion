'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Fuel, Calendar, TrendingUp, Building2, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Estacion } from './est-estaciones';

type ProductoResumen = { nombre: string; color: string; galones: number };
type DiaResumen = { fecha: string; galones: number };

function fmt(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

interface Props {
  estaciones: Estacion[];
  selectedId: string | null;
}

export function EstGalonajeDashboard({ estaciones, selectedId }: Props) {
  const [loading, setLoading] = useState(true);
  const [vistaEstacion, setVistaEstacion] = useState<string>(selectedId ?? 'todas');
  const [productosHoy, setProductosHoy] = useState<ProductoResumen[]>([]);
  const [productosMes, setProductosMes] = useState<ProductoResumen[]>([]);
  const [productosAno, setProductosAno] = useState<ProductoResumen[]>([]);
  const [diasMes, setDiasMes] = useState<DiaResumen[]>([]);
  const [estacionesComparativo, setEstacionesComparativo] = useState<{ nombre: string; galones: number }[]>([]);

  const fetchGalonaje = useCallback(async () => {
    setLoading(true);
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
    const inicioAno = new Date(hoy.getFullYear(), 0, 1).toISOString().split('T')[0];

    let estacionFilter = '';
    if (vistaEstacion !== 'todas') estacionFilter = `&estacion_id=eq.${vistaEstacion}`;

    // Fetch lecturas with galones for today
    const [hoyRes, mesRes, anoRes, diasRes] = await Promise.all([
      supabase.from('est_lecturas').select('galones_vendidos, nombre_producto, color_producto, estacion_id').filter(`galones_vendidos=not.is.null${estacionFilter}`),
      supabase.from('est_lecturas').select('galones_vendidos, nombre_producto, color_producto, estacion_id, cierre_id').filter(`galones_vendidos=not.is.null${estacionFilter}`),
      supabase.from('est_lecturas').select('galones_vendidos, nombre_producto, color_producto, estacion_id').filter(`galones_vendidos=not.is.null${estacionFilter}`),
      supabase.from('est_lecturas').select('galones_vendidos, estacion_id, cierre_id').filter(`galones_vendidos=not.is.null${estacionFilter}`),
    ]);

    // Need to filter by date via cierre_id → est_cierres.fecha
    // Get all cierres for filtering
    const { data: cierres } = await supabase
      .from('est_cierres')
      .select('id, fecha, estacion_id')
      .gte('fecha', inicioAno);

    const cierreFecha: Record<string, string> = {};
    (cierres ?? []).forEach((c: { id: string; fecha: string }) => { cierreFecha[c.id] = c.fecha; });

    const agruparPorProducto = (rows: { galones_vendidos: number | null; nombre_producto: string | null; color_producto: string; cierre_id: string | null; estacion_id: string }[] | null, filtroFecha?: (f: string) => boolean) => {
      const m: Record<string, ProductoResumen> = {};
      (rows ?? []).forEach((r) => {
        if (r.galones_vendidos === null) return;
        if (r.cierre_id && cierreFecha[r.cierre_id]) {
          const f = cierreFecha[r.cierre_id];
          if (filtroFecha && !filtroFecha(f)) return;
        }
        const key = r.nombre_producto ?? 'Sin producto';
        if (!m[key]) m[key] = { nombre: key, color: r.color_producto ?? '#94a3b8', galones: 0 };
        m[key].galones += r.galones_vendidos;
      });
      return Object.values(m).sort((a, b) => b.galones - a.galones);
    };

    const esHoy = (f: string) => f === hoyStr;
    const esMes = (f: string) => f >= inicioMes && f <= hoyStr;
    const esAno = (f: string) => f >= inicioAno && f <= hoyStr;

    setProductosHoy(agruparPorProducto(hoyRes.data as any, esHoy));
    setProductosMes(agruparPorProducto(mesRes.data as any, esMes));
    setProductosAno(agruparPorProducto(anoRes.data as any, esAno));

    // Daily breakdown for current month
    const diasMap: Record<string, number> = {};
    (diasRes.data ?? []).forEach((r: any) => {
      if (r.galones_vendidos === null) return;
      if (r.cierre_id && cierreFecha[r.cierre_id]) {
        const f = cierreFecha[r.cierre_id];
        if (f >= inicioMes && f <= hoyStr) {
          diasMap[f] = (diasMap[f] ?? 0) + r.galones_vendidos;
        }
      }
    });
    setDiasMes(Object.entries(diasMap).map(([fecha, galones]) => ({ fecha, galones })).sort((a, b) => a.fecha.localeCompare(b.fecha)));

    // Comparative by station (only in "todas" mode)
    if (vistaEstacion === 'todas') {
      const estMap: Record<string, number> = {};
      (diasRes.data ?? []).forEach((r: any) => {
        if (r.galones_vendidos === null) return;
        if (r.cierre_id && cierreFecha[r.cierre_id]) {
          const f = cierreFecha[r.cierre_id];
          if (f >= inicioMes && f <= hoyStr && r.estacion_id) {
            estMap[r.estacion_id] = (estMap[r.estacion_id] ?? 0) + r.galones_vendidos;
          }
        }
      });
      const comp = estaciones
        .map((e) => ({ nombre: e.nombre, galones: estMap[e.id] ?? 0 }))
        .filter((e) => e.galones > 0)
        .sort((a, b) => b.galones - a.galones);
      setEstacionesComparativo(comp);
    } else {
      setEstacionesComparativo([]);
    }

    setLoading(false);
  }, [vistaEstacion, estaciones]);

  useEffect(() => {
    fetchGalonaje();
  }, [fetchGalonaje]);

  useEffect(() => {
    if (selectedId && vistaEstacion === 'todas' && estaciones.length > 0) {
      // Don't auto-switch if user selected "todas"
    }
  }, [selectedId, vistaEstacion, estaciones.length]);

  const totalHoy = useMemo(() => productosHoy.reduce((s, p) => s + p.galones, 0), [productosHoy]);
  const totalMes = useMemo(() => productosMes.reduce((s, p) => s + p.galones, 0), [productosMes]);
  const totalAno = useMemo(() => productosAno.reduce((s, p) => s + p.galones, 0), [productosAno]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Dashboard de Galonaje</h2>
          <p className="text-sm text-slate-500">Resumen de galones vendidos por periodo</p>
        </div>
        <Select value={vistaEstacion} onValueChange={setVistaEstacion}>
          <SelectTrigger className="w-[200px]">
            <Building2 className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las estaciones</SelectItem>
            {estaciones.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period totals */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PeriodCard label="Galones del día" value={fmt(totalHoy)} sub={new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })} icon={Calendar} color="bg-amber-50 text-amber-700" />
        <PeriodCard label="Galones del mes" value={fmt(totalMes)} sub={new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })} icon={TrendingUp} color="bg-blue-50 text-blue-700" />
        <PeriodCard label="Galones del año" value={fmt(totalAno)} sub={String(new Date().getFullYear())} icon={BarChart3} color="bg-emerald-50 text-emerald-700" />
      </div>

      {/* Product breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ProductBreakdown title="Hoy" productos={productosHoy} total={totalHoy} />
        <ProductBreakdown title="Mes actual" productos={productosMes} total={totalMes} />
        <ProductBreakdown title="Año actual" productos={productosAno} total={totalAno} />
      </div>

      {/* Daily chart + station comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Daily breakdown */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Galonaje diario del mes</h3>
          </div>
          {diasMes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sin datos de galonaje para este mes.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {diasMes.map((d) => (
                <div key={d.fecha} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-slate-500 shrink-0">
                    {new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-400 to-amber-600 h-full rounded-full transition-all"
                      style={{ width: `${(d.galones / Math.max(...diasMes.map((x) => x.galones))) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-20 text-right">{fmt(d.galones)} gal</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Station comparison */}
        {vistaEstacion === 'todas' && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-violet-600" />
              <h3 className="text-sm font-bold text-slate-900">Comparativo por estación (mes)</h3>
            </div>
            {estacionesComparativo.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Sin datos comparativos para este mes.</p>
            ) : (
              <div className="space-y-2">
                {estacionesComparativo.map((e, i) => {
                  const maxGal = Math.max(...estacionesComparativo.map((x) => x.galones));
                  return (
                    <div key={e.nombre} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-slate-400 shrink-0">{i + 1}</span>
                      <span className="w-32 text-xs font-medium text-slate-700 shrink-0 truncate">{e.nombre}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-violet-400 to-violet-600 h-full rounded-full transition-all"
                          style={{ width: `${(e.galones / maxGal) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-20 text-right">{fmt(e.galones)} gal</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* Total empresa when todas */}
        {vistaEstacion === 'todas' && estacionesComparativo.length > 0 && (
          <Card className="p-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="h-5 w-5 text-amber-400" />
              <h3 className="text-sm font-bold">Total empresa (mes)</h3>
            </div>
            <p className="text-3xl font-bold">{fmt(totalMes)} <span className="text-base font-normal text-slate-300">galones</span></p>
            <p className="mt-2 text-xs text-slate-400">Consolidado de {estacionesComparativo.length} estacion{estacionesComparativo.length !== 1 ? 'es' : ''} con actividad</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function PeriodCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub: string; icon: typeof Fuel; color: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}

function ProductBreakdown({ title, productos, total }: { title: string; productos: ProductoResumen[]; total: number }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Fuel className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-bold text-slate-900">Por combustible — {title}</h3>
      </div>
      {productos.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">Sin datos.</p>
      ) : (
        <div className="space-y-2.5">
          {productos.map((p) => (
            <div key={p.nombre} className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="text-sm font-medium text-slate-700 flex-1">{p.nombre}</span>
              <span className="text-sm font-bold text-slate-900">{fmt(p.galones)}</span>
              <span className="text-xs text-slate-400 w-10 text-right">
                {total > 0 ? `${((p.galones / total) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Total</span>
            <span className="text-sm font-bold text-amber-700">{fmt(total)} gal</span>
          </div>
        </div>
      )}
    </Card>
  );
}
