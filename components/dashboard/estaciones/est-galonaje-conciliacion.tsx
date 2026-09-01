'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Scale, Loader2, Download, CheckCircle2, AlertTriangle, XCircle, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Lectura = {
  id: string;
  fecha: string;
  turno: string | null;
  nombre_producto: string | null;
  numero_manguera: number | null;
  lectura_inicial: number | null;
  lectura_final: number | null;
  galones_vendidos: number;
  precio_unitario: number | null;
  empleado: string | null;
  source: string;
};

type ConciliacionRow = {
  id: string;
  fecha: string;
  turno: string | null;
  producto: string | null;
  manguera: number | null;
  inicial: number | null;
  final: number | null;
  galonesRegistrados: number;
  galonesCalculados: number | null;
  diferencia: number | null;
  estado: 'coincide' | 'dentro_tolerancia' | 'revisar' | 'sin_datos';
  empleado: string | null;
  source: string;
};

type Estacion = { id: string; nombre: string };

export function EstGalonajeConciliacion({ estaciones }: { estaciones: Estacion[] }) {
  const [loading, setLoading] = useState(true);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [estacionId, setEstacionId] = useState<string>('all');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');
  const [tolerancia, setTolerancia] = useState<number>(0.10);

  const fetchTolerancia = useCallback(async () => {
    const { data } = await supabase
      .from('est_configuracion')
      .select('tolerancia_galones')
      .maybeSingle();
    if (data?.tolerancia_galones) setTolerancia(Number(data.tolerancia_galones));
  }, []);

  const fetchLecturas = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('est_lecturas')
      .select('id, fecha, turno, nombre_producto, numero_manguera, lectura_inicial, lectura_final, galones_vendidos, precio_unitario, empleado, source')
      .order('fecha', { ascending: false })
      .limit(2000);

    if (estacionId !== 'all') {
      query = query.eq('estacion_id', estacionId);
    }
    if (fechaInicio) {
      query = query.gte('fecha', fechaInicio);
    }
    if (fechaFin) {
      query = query.lte('fecha', fechaFin);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Error al cargar lecturas.');
    } else {
      setLecturas((data as Lectura[]) ?? []);
    }
    setLoading(false);
  }, [estacionId, fechaInicio, fechaFin]);

  useEffect(() => { fetchTolerancia(); }, [fetchTolerancia]);
  useEffect(() => { fetchLecturas(); }, [fetchLecturas]);

  const conciliacion: ConciliacionRow[] = useMemo(() => {
    return lecturas.map((l) => {
      const calculados = (l.lectura_inicial !== null && l.lectura_final !== null)
        ? l.lectura_final - l.lectura_inicial
        : null;
      const diferencia = calculados !== null
        ? Math.abs(calculados - l.galones_vendidos)
        : null;

      let estado: ConciliacionRow['estado'] = 'sin_datos';
      if (diferencia !== null) {
        if (diferencia === 0) estado = 'coincide';
        else if (diferencia <= tolerancia) estado = 'dentro_tolerancia';
        else estado = 'revisar';
      }

      return {
        id: l.id,
        fecha: l.fecha,
        turno: l.turno,
        producto: l.nombre_producto,
        manguera: l.numero_manguera,
        inicial: l.lectura_inicial,
        final: l.lectura_final,
        galonesRegistrados: l.galones_vendidos,
        galonesCalculados: calculados,
        diferencia,
        estado,
        empleado: l.empleado,
        source: l.source,
      };
    });
  }, [lecturas, tolerancia]);

  const stats = useMemo(() => {
    const coincide = conciliacion.filter((r) => r.estado === 'coincide').length;
    const dentroTol = conciliacion.filter((r) => r.estado === 'dentro_tolerancia').length;
    const revisar = conciliacion.filter((r) => r.estado === 'revisar').length;
    const sinDatos = conciliacion.filter((r) => r.estado === 'sin_datos').length;
    return { coincide, dentroTol, revisar, sinDatos, total: conciliacion.length };
  }, [conciliacion]);

  const handleExport = () => {
    const headers = ['Fecha', 'Turno', 'Producto', 'Manguera', 'Inicial', 'Final', 'Galones Registrados', 'Galones Calculados', 'Diferencia', 'Estado', 'Empleado', 'Origen'];
    const lines = [headers.join(',')];
    conciliacion.forEach((r) => {
      const row = [
        r.fecha,
        `"${r.turno ?? ''}"`,
        `"${r.producto ?? ''}"`,
        r.manguera ?? '',
        r.inicial ?? '',
        r.final ?? '',
        r.galonesRegistrados,
        r.galonesCalculados ?? '',
        r.diferencia ? r.diferencia.toFixed(3) : '',
        r.estado,
        `"${r.empleado ?? ''}"`,
        r.source,
      ];
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conciliacion_galonaje_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ESTADO_CONFIG: Record<ConciliacionRow['estado'], { label: string; cls: string; icon: typeof CheckCircle2 }> = {
    coincide: { label: 'Coincide', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
    dentro_tolerancia: { label: 'Dentro de tolerancia', cls: 'bg-blue-50 text-blue-700', icon: CheckCircle2 },
    revisar: { label: 'Revisar', cls: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
    sin_datos: { label: 'Sin datos', cls: 'bg-slate-100 text-slate-500', icon: XCircle },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-bold text-slate-900">Conciliación de Galonaje</h2>
        <span className="text-xs text-slate-400">vs Iniciales / Finales</span>
      </div>

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
            <Label className="text-xs font-semibold text-slate-600">Fecha inicial</Label>
            <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Fecha final</Label>
            <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Tolerancia (galones)</Label>
            <Input
              type="number"
              step="0.01"
              value={tolerancia}
              onChange={(e) => setTolerancia(parseFloat(e.target.value) || 0)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />Exportar conciliación
          </Button>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{stats.coincide}</p>
          <p className="text-xs text-emerald-600">Coincide</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{stats.dentroTol}</p>
          <p className="text-xs text-blue-600">Dentro de tolerancia</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{stats.revisar}</p>
          <p className="text-xs text-amber-600">Revisar</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-4 text-center">
          <p className="text-2xl font-bold text-slate-600">{stats.sinDatos}</p>
          <p className="text-xs text-slate-500">Sin datos para comparar</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : conciliacion.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Filter className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-600">No hay datos para conciliar</p>
          <p className="mt-1 text-xs text-slate-400">Importa lecturas con iniciales y finales para ver la conciliación.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Turno</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Producto</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Manguera</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Inicial</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Final</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Gal. registrados</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Gal. calculados</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Diferencia</th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Estado</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Empleado</th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Origen</th>
              </tr>
            </thead>
            <tbody>
              {conciliacion.slice(0, 200).map((row) => {
                const cfg = ESTADO_CONFIG[row.estado];
                return (
                  <tr key={row.id} className={cn(
                    'border-t border-slate-100',
                    row.estado === 'revisar' ? 'bg-amber-50/40' : row.estado === 'coincide' ? 'bg-emerald-50/20' : ''
                  )}>
                    <td className="px-3 py-2 text-slate-700">{row.fecha}</td>
                    <td className="px-3 py-2 text-slate-700">{row.turno ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.producto ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.manguera ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.inicial?.toLocaleString('es-CO', { maximumFractionDigits: 3 }) ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.final?.toLocaleString('es-CO', { maximumFractionDigits: 3 }) ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{row.galonesRegistrados.toLocaleString('es-CO', { maximumFractionDigits: 3 })}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{row.galonesCalculados?.toLocaleString('es-CO', { maximumFractionDigits: 3 }) ?? '—'}</td>
                    <td className={cn('px-3 py-2 text-right font-semibold', row.diferencia && row.diferencia > tolerancia ? 'text-amber-600' : 'text-slate-700')}>
                      {row.diferencia !== null ? row.diferencia.toFixed(3) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge className={cn('text-[10px]', cfg.cls)}>
                        {row.estado === 'coincide' && '🟢 '}
                        {row.estado === 'dentro_tolerancia' && '🟢 '}
                        {row.estado === 'revisar' && '🟠 '}
                        {row.estado === 'sin_datos' && '⚪ '}
                        {cfg.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{row.empleado ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className={cn('text-[10px]', row.source === 'imported' ? 'text-blue-600' : 'text-slate-500')}>
                        {row.source === 'imported' ? 'Importado' : 'Nativo'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {conciliacion.length > 200 && (
            <p className="p-3 text-center text-xs text-slate-400">Mostrando 200 de {conciliacion.length} registros.</p>
          )}
        </div>
      )}
    </div>
  );
}
