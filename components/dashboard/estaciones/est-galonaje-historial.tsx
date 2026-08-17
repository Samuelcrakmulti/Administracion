'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, History, Filter, Fuel, Layers, Gauge, Droplet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Estacion } from './est-estaciones';

type LecturaHist = {
  id: string;
  nombre_isla: string;
  nombre_surtidor: string;
  nombre_manguera: string;
  numero_manguera: number;
  nombre_producto: string | null;
  color_producto: string;
  lectura_inicial: number | null;
  lectura_final: number | null;
  galones_vendidos: number | null;
  estado: string;
  inicial_heredada: boolean;
  inicial_modificada: boolean;
  cierre_id: string | null;
  estacion_id: string;
  created_at: string;
};

type CierreInfo = { id: string; fecha: string; turno_label: string; empleado_nombre: string | null };

function fmt(n: number | null): string {
  if (n === null) return '—';
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

interface Props {
  estacion: Estacion;
}

export function EstGalonajeHistorial({ estacion }: Props) {
  const [loading, setLoading] = useState(true);
  const [lecturas, setLecturas] = useState<LecturaHist[]>([]);
  const [cierresMap, setCierresMap] = useState<Record<string, CierreInfo>>({});
  const [search, setSearch] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const productos = useCallback(() => {
    const set = new Map<string, string>();
    lecturas.forEach((l) => {
      if (l.nombre_producto) set.set(l.nombre_producto, l.color_producto);
    });
    return Array.from(set.entries()).map(([nombre, color]) => ({ nombre, color }));
  }, [lecturas]);

  const fetchHistorial = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from('est_lecturas')
      .select('*')
      .eq('estacion_id', estacion.id)
      .order('created_at', { ascending: false });

    const { data } = await query;
    const lecturasData = (data as LecturaHist[]) ?? [];

    // Fetch related cierres
    const cierreIds = [...new Set(lecturasData.map((l) => l.cierre_id).filter(Boolean))] as string[];
    let cMap: Record<string, CierreInfo> = {};
    if (cierreIds.length > 0) {
      const { data: cierres } = await supabase
        .from('est_cierres')
        .select('id, fecha, turno_label, empleado_nombre')
        .in('id', cierreIds);
      (cierres ?? []).forEach((c: any) => { cMap[c.id] = c; });
    }

    setCierresMap(cMap);
    setLecturas(lecturasData);
    setLoading(false);
  }, [estacion.id]);

  useEffect(() => { fetchHistorial(); }, [fetchHistorial]);

  const filtered = lecturas.filter((l) => {
    const matchSearch = search === '' ||
      l.nombre_manguera.toLowerCase().includes(search.toLowerCase()) ||
      l.nombre_surtidor.toLowerCase().includes(search.toLowerCase()) ||
      l.nombre_isla.toLowerCase().includes(search.toLowerCase()) ||
      (l.nombre_producto ?? '').toLowerCase().includes(search.toLowerCase());

    const matchProducto = filtroProducto === 'todos' || l.nombre_producto === filtroProducto;
    const matchEstado = filtroEstado === 'todos' || l.estado === filtroEstado;

    let matchFecha = true;
    const cierre = l.cierre_id ? cierresMap[l.cierre_id] : null;
    const fechaLectura = cierre?.fecha ?? l.created_at.split('T')[0];
    if (fechaInicio && fechaLectura < fechaInicio) matchFecha = false;
    if (fechaFin && fechaLectura > fechaFin) matchFecha = false;

    return matchSearch && matchProducto && matchEstado && matchFecha;
  });

  const totalGalones = filtered.reduce((s, l) => s + (l.galones_vendidos ?? 0), 0);

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
      <div>
        <h2 className="text-lg font-bold text-slate-900">Historial de Lecturas — {estacion.nombre}</h2>
        <p className="text-sm text-slate-500">{filtered.length} registro(s) · {fmt(totalGalones)} galones total</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
        </div>
        <Select value={filtroProducto} onValueChange={setFiltroProducto}>
          <SelectTrigger><Filter className="h-4 w-4 mr-2 text-slate-400" /><SelectValue placeholder="Producto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los productos</SelectItem>
            {productos().map((p) => (
              <SelectItem key={p.nombre} value={p.nombre}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectItem value="completa">Completa</SelectItem>
            <SelectItem value="incompleta">Incompleta</SelectItem>
            <SelectItem value="inconsistente">Inconsistente</SelectItem>
            <SelectItem value="fuera_servicio">Fuera de servicio</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-xs" />
          <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-xs" />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <History className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="mt-5 text-base font-bold text-slate-700">Sin registros de lecturas</h3>
            <p className="mt-1.5 text-sm text-slate-400">No se encontraron lecturas con los filtros aplicados.</p>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {['Fecha', 'Turno', 'Isla', 'Surtidor', 'Manguera', 'Producto', 'Inicial', 'Final', 'Galones', 'Estado'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => {
                  const cierre = l.cierre_id ? cierresMap[l.cierre_id] : null;
                  const fecha = cierre?.fecha ?? l.created_at.split('T')[0];
                  const isInconsistent = l.lectura_final !== null && l.lectura_inicial !== null && l.lectura_final < l.lectura_inicial;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                        {new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">{cierre?.turno_label ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{l.nombre_isla}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{l.nombre_surtidor}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{l.nombre_manguera}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color_producto }} />
                          {l.nombre_producto ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap font-mono">
                        {fmt(l.lectura_inicial)}
                        {l.inicial_modificada && <span className="ml-1 text-[10px] text-amber-600" title="Modificada">⚠</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap font-mono">{fmt(l.lectura_final)}</td>
                      <td className={cn('px-4 py-3 text-sm font-bold whitespace-nowrap font-mono', isInconsistent ? 'text-red-600' : 'text-emerald-700')}>
                        {fmt(l.galones_vendidos)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <EstadoBadge estado={l.estado} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    completa: { label: 'Completa', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    incompleta: { label: 'Incompleta', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    inconsistente: { label: 'Inconsistente', cls: 'bg-red-50 text-red-700 border-red-200' },
    fuera_servicio: { label: 'Fuera servicio', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const c = config[estado] ?? config.completa;
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold', c.cls)}>{c.label}</span>;
}
