'use client';

import { useState, useEffect, useMemo } from 'react';
import { Fuel, Download, Loader2, TrendingUp, Calendar, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Lectura = {
  id: string;
  estacion_id: string;
  fecha: string;
  turno: string | null;
  nombre_producto: string | null;
  numero_manguera: number | null;
  galones_vendidos: number;
  precio_unitario: number | null;
  empleado: string | null;
  source: string;
};

type Estacion = { id: string; nombre: string };

export function ReporteGalonaje({ estaciones }: { estaciones: Estacion[] }) {
  const [loading, setLoading] = useState(true);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [estacionId, setEstacionId] = useState<string>('all');
  const [producto, setProducto] = useState<string>('all');
  const [turno, setTurno] = useState<string>('all');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');

  const fetchLecturas = async () => {
    setLoading(true);
    let query = supabase
      .from('est_lecturas')
      .select('id, estacion_id, fecha, turno, nombre_producto, numero_manguera, galones_vendidos, precio_unitario, empleado, source')
      .order('fecha', { ascending: false })
      .limit(5000);

    if (estacionId !== 'all') query = query.eq('estacion_id', estacionId);
    if (fechaInicio) query = query.gte('fecha', fechaInicio);
    if (fechaFin) query = query.lte('fecha', fechaFin);

    const { data } = await query;
    setLecturas((data as Lectura[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLecturas(); }, [estacionId, fechaInicio, fechaFin]);

  const productosDisponibles = useMemo(() => {
    return [...new Set(lecturas.map((l) => l.nombre_producto).filter(Boolean))] as string[];
  }, [lecturas]);

  const turnosDisponibles = useMemo(() => {
    return [...new Set(lecturas.map((l) => l.turno).filter(Boolean))] as string[];
  }, [lecturas]);

  const filtered = useMemo(() => {
    return lecturas.filter((l) => {
      if (producto !== 'all' && l.nombre_producto !== producto) return false;
      if (turno !== 'all' && l.turno !== turno) return false;
      return true;
    });
  }, [lecturas, producto, turno]);

  // Group by fecha + producto for daily totals
  const porDia = useMemo(() => {
    const map = new Map<string, { fecha: string; producto: string; galones: number; registros: number }>();
    filtered.forEach((l) => {
      const key = `${l.fecha}|${l.nombre_producto ?? 'N/A'}`;
      const existing = map.get(key);
      if (existing) {
        existing.galones += l.galones_vendidos;
        existing.registros += 1;
      } else {
        map.set(key, { fecha: l.fecha, producto: l.nombre_producto ?? 'N/A', galones: l.galones_vendidos, registros: 1 });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [filtered]);

  // Totals by product
  const porProducto = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((l) => {
      const p = l.nombre_producto ?? 'N/A';
      map.set(p, (map.get(p) ?? 0) + l.galones_vendidos);
    });
    return Array.from(map.entries()).map(([producto, galones]) => ({ producto, galones })).sort((a, b) => b.galones - a.galones);
  }, [filtered]);

  // Totals by turno
  const porTurno = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((l) => {
      const t = l.turno ?? 'N/A';
      map.set(t, (map.get(t) ?? 0) + l.galones_vendidos);
    });
    return Array.from(map.entries()).map(([turno, galones]) => ({ turno, galones })).sort((a, b) => b.galones - a.galones);
  }, [filtered]);

  // Totals by estacion
  const porEstacion = useMemo(() => {
    const map = new Map<string, { nombre: string; galones: number }>();
    filtered.forEach((l) => {
      const est = estaciones.find((e) => e.id === l.estacion_id);
      const nombre = est?.nombre ?? 'N/A';
      const existing = map.get(l.estacion_id);
      if (existing) {
        existing.galones += l.galones_vendidos;
      } else {
        map.set(l.estacion_id, { nombre, galones: l.galones_vendidos });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.galones - a.galones);
  }, [filtered, estaciones]);

  // Accumulated by month
  const porMes = useMemo(() => {
    const map = new Map<string, { mes: string; galones: number }>();
    filtered.forEach((l) => {
      const mes = l.fecha.substring(0, 7);
      const existing = map.get(mes);
      if (existing) {
        existing.galones += l.galones_vendidos;
      } else {
        map.set(mes, { mes, galones: l.galones_vendidos });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
  }, [filtered]);

  const totalGalones = filtered.reduce((sum, l) => sum + l.galones_vendidos, 0);
  const totalRegistros = filtered.length;

  // Calculate acumulado (running total) for daily entries
  const conAcumulado = useMemo(() => {
    let acum = 0;
    return porDia.map((d) => {
      acum += d.galones;
      return { ...d, acumulado: acum };
    });
  }, [porDia]);

  const handleExport = () => {
    const headers = ['Fecha', 'Turno', 'Producto', 'Manguera', 'Galones', 'Precio', 'Empleado', 'Estacion', 'Origen'];
    const lines = [headers.join(',')];
    filtered.forEach((l) => {
      const est = estaciones.find((e) => e.id === l.estacion_id)?.nombre ?? '';
      lines.push([
        l.fecha,
        `"${l.turno ?? ''}"`,
        `"${l.nombre_producto ?? ''}"`,
        l.numero_manguera ?? '',
        l.galones_vendidos,
        l.precio_unitario ?? '',
        `"${l.empleado ?? ''}"`,
        `"${est}"`,
        l.source,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_galonaje_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Estación</Label>
            <Select value={estacionId} onValueChange={setEstacionId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las estaciones</SelectItem>
                {estaciones.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Producto</Label>
            <Select value={producto} onValueChange={setProducto}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                {productosDisponibles.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Turno</Label>
            <Select value={turno} onValueChange={setTurno}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los turnos</SelectItem>
                {turnosDisponibles.map((t) => <SelectItem key={t} value={t}>Turno {t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha inicial</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha final</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />Exportar galonaje
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Fuel className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-600">No hay datos de galonaje</p>
          <p className="mt-1 text-xs text-slate-400">Importa archivos de galonaje para ver el reporte.</p>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{totalGalones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p>
              <p className="text-xs text-amber-600">Galones totales</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{totalRegistros}</p>
              <p className="text-xs text-blue-600">Registros</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{porProducto.length}</p>
              <p className="text-xs text-emerald-600">Productos</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">{porEstacion.length}</p>
              <p className="text-xs text-slate-500">Estaciones</p>
            </div>
          </div>

          {/* By product */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Galones por producto</h3>
            </div>
            <div className="space-y-2">
              {porProducto.map((p) => {
                const pct = totalGalones > 0 ? (p.galones / totalGalones) * 100 : 0;
                return (
                  <div key={p.producto} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-semibold text-slate-700">{p.producto}</div>
                    <div className="flex-1 h-6 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 2)}%` }}>
                        <span className="text-[10px] font-bold text-white">{p.galones.toLocaleString('es-CO', { maximumFractionDigits: 1 })}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* By station (ranking) */}
          {estacionId === 'all' && porEstacion.length > 1 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Ranking de estaciones</h3>
              </div>
              <div className="space-y-2">
                {porEstacion.map((e, idx) => (
                  <div key={e.nombre} className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                      idx === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    )}>{idx + 1}</div>
                    <div className="flex-1 text-sm font-semibold text-slate-800">{e.nombre}</div>
                    <div className="text-sm font-bold text-slate-900">{e.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</div>
                    <div className="text-xs text-slate-400">galones</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* By turn */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Galones por turno</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {porTurno.map((t) => (
                <div key={t.turno} className="rounded-xl bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Turno {t.turno}</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{t.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p>
                  <p className="text-[10px] text-slate-400">galones</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Monthly acumulado */}
          {porMes.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Acumulado mensual</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {porMes.map((m) => (
                  <div key={m.mes} className="rounded-xl border border-slate-200 p-3 text-center">
                    <p className="text-xs font-semibold text-slate-600">{m.mes}</p>
                    <p className="mt-1 text-base font-bold text-slate-900">{m.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-slate-400">galones</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Detailed table with acumulado */}
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Detalle por día</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Producto</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Galones</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Acumulado</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Registros</th>
                  </tr>
                </thead>
                <tbody>
                  {conAcumulado.slice(0, 100).map((d, i) => (
                    <tr key={`${d.fecha}-${d.producto}-${i}`} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{d.fecha}</td>
                      <td className="px-3 py-2 text-slate-700">{d.producto}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{d.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{d.acumulado.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{d.registros}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {conAcumulado.length > 100 && <p className="mt-2 text-center text-xs text-slate-400">Mostrando 100 de {conAcumulado.length} registros.</p>}
          </Card>
        </>
      )}
    </div>
  );
}
