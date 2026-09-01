'use client';

import { useState, useEffect, useMemo } from 'react';
import { Fuel, Download, Loader2, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Tanque = {
  id: string;
  estacion_id: string;
  producto_id: string | null;
  nombre: string;
  codigo: string | null;
  capacidad_maxima_galones: number;
  nivel_actual_galones: number;
  nivel_alerta_galones: number;
  nivel_critico_galones: number;
  estado: string;
};

type Estacion = { id: string; nombre: string };
type Producto = { id: string; nombre: string };

export function ReporteCombustible({ estaciones, estacionId }: { estaciones: Estacion[]; estacionId: string }) {
  const [loading, setLoading] = useState(true);
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrotanques, setCarrotanques] = useState<{ tanque_id: string | null; cantidad_galones: number; fecha: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [tanqRes, prodRes] = await Promise.all([
        supabase.from('est_tanques').select('*'),
        supabase.from('est_productos').select('id, nombre'),
      ]);
      setTanques((tanqRes.data as Tanque[]) ?? []);
      setProductos((prodRes.data as Producto[]) ?? []);

      const { data: carrots } = await supabase.from('est_carrotanques').select('tanque_id, cantidad_galones, fecha');
      setCarrotanques((carrots as { tanque_id: string | null; cantidad_galones: number; fecha: string }[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const estMap = useMemo(() => new Map(estaciones.map((e) => [e.id, e.nombre])), [estaciones]);
  const prodMap = useMemo(() => new Map(productos.map((p) => [p.id, p.nombre])), [productos]);

  const filteredTanques = useMemo(() => {
    if (estacionId === 'all') return tanques;
    return tanques.filter((t) => t.estacion_id === estacionId);
  }, [tanques, estacionId]);

  const getTanqueEstado = (t: Tanque): 'normal' | 'bajo' | 'critico' => {
    const nivel = Number(t.nivel_actual_galones) || 0;
    const alerta = Number(t.nivel_alerta_galones) || 0;
    const critico = Number(t.nivel_critico_galones) || 0;
    if (critico > 0 && nivel <= critico) return 'critico';
    if (alerta > 0 && nivel <= alerta) return 'bajo';
    return 'normal';
  };

  const entradasPorTanque = useMemo(() => {
    const map = new Map<string, number>();
    carrotanques.forEach((c) => {
      if (c.tanque_id) {
        map.set(c.tanque_id, (map.get(c.tanque_id) ?? 0) + (Number(c.cantidad_galones) || 0));
      }
    });
    return map;
  }, [carrotanques]);

  const handleExport = () => {
    const headers = ['Estacion', 'Tanque', 'Combustible', 'Capacidad Max', 'Nivel Actual', 'Nivel Alerta', 'Nivel Critico', 'Nivel %', 'Estado', 'Entradas Totales'];
    const lines = [headers.join(',')];
    filteredTanques.forEach((t) => {
      const estado = getTanqueEstado(t);
      const pct = t.capacidad_maxima_galones > 0 ? ((Number(t.nivel_actual_galones) || 0) / Number(t.capacidad_maxima_galones)) * 100 : 0;
      lines.push([
        `"${estMap.get(t.estacion_id) ?? ''}"`,
        `"${t.nombre}"`,
        `"${prodMap.get(t.producto_id ?? '') ?? 'N/A'}"`,
        t.capacidad_maxima_galones,
        t.nivel_actual_galones,
        t.nivel_alerta_galones,
        t.nivel_critico_galones,
        pct.toFixed(1) + '%',
        estado,
        entradasPorTanque.get(t.id) ?? 0,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_combustible_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const normales = filteredTanques.filter((t) => getTanqueEstado(t) === 'normal').length;
    const bajos = filteredTanques.filter((t) => getTanqueEstado(t) === 'bajo').length;
    const criticos = filteredTanques.filter((t) => getTanqueEstado(t) === 'critico').length;
    const totalGalones = filteredTanques.reduce((s, t) => s + (Number(t.nivel_actual_galones) || 0), 0);
    return { normales, bajos, criticos, totalGalones };
  }, [filteredTanques]);

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  if (filteredTanques.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <Database className="h-10 w-10 text-slate-300" />
        <p className="mt-4 text-sm font-semibold text-slate-600">No hay tanques configurados</p>
        <p className="mt-1 text-xs text-slate-400">Configura tanques en el módulo de Estaciones de Servicio.</p>
      </Card>
    );
  }

  const ESTADO_CFG: Record<string, { label: string; cls: string; icon: string }> = {
    normal: { label: 'Normal', cls: 'bg-emerald-50 text-emerald-700', icon: '🟢' },
    bajo: { label: 'Bajo', cls: 'bg-amber-50 text-amber-700', icon: '🟡' },
    critico: { label: 'Crítico', cls: 'bg-red-50 text-red-700', icon: '🔴' },
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-100 p-4 text-center"><p className="text-2xl font-bold text-slate-700">{stats.totalGalones.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p><p className="text-xs text-slate-500">Galones en tanques</p></div>
        <div className="rounded-xl bg-emerald-50 p-4 text-center"><p className="text-2xl font-bold text-emerald-700">{stats.normales}</p><p className="text-xs text-emerald-600">Tanques normales</p></div>
        <div className="rounded-xl bg-amber-50 p-4 text-center"><p className="text-2xl font-bold text-amber-700">{stats.bajos}</p><p className="text-xs text-amber-600">Tanques bajos</p></div>
        <div className="rounded-xl bg-red-50 p-4 text-center"><p className="text-2xl font-bold text-red-700">{stats.criticos}</p><p className="text-xs text-red-600">Tanques críticos</p></div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs"><Download className="h-3.5 w-3.5" />Exportar</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Estación</th>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Tanque</th>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Combustible</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Capacidad</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Nivel actual</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Nivel %</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Entradas</th>
              <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filteredTanques.map((t) => {
              const estado = getTanqueEstado(t);
              const cfg = ESTADO_CFG[estado];
              const pct = Number(t.capacidad_maxima_galones) > 0 ? ((Number(t.nivel_actual_galones) || 0) / Number(t.capacidad_maxima_galones)) * 100 : 0;
              return (
                <tr key={t.id} className={cn('border-t border-slate-100', estado === 'critico' ? 'bg-red-50/40' : estado === 'bajo' ? 'bg-amber-50/40' : '')}>
                  <td className="px-3 py-2 text-slate-700">{estMap.get(t.estacion_id) ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700 font-medium">{t.nombre}</td>
                  <td className="px-3 py-2 text-slate-700">{prodMap.get(t.producto_id ?? '') ?? 'N/A'}</td>
                  <td className="px-3 py-2 text-right text-slate-600">{Number(t.capacidad_maxima_galones).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(t.nivel_actual_galones).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                        <div className={cn('h-full rounded-full', estado === 'critico' ? 'bg-red-500' : estado === 'bajo' ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                      <span className="text-slate-600 w-10">{pct.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-600">{(entradasPorTanque.get(t.id) ?? 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                  <td className="px-3 py-2 text-center"><Badge className={cn('text-[10px]', cfg.cls)}>{cfg.icon} {cfg.label}</Badge></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(stats.bajos > 0 || stats.criticos > 0) && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Se recomienda solicitar abastecimiento</p>
            <p className="text-xs text-amber-600 mt-0.5">{stats.criticos} tanque(s) en nivel crítico y {stats.bajos} tanque(s) con nivel bajo.</p>
          </div>
        </div>
      )}
    </div>
  );
}
