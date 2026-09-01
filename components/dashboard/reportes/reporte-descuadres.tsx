'use client';

import { useState, useEffect, useMemo } from 'react';
import { Scale, Download, Loader2, Database, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Cuadre = {
  id: string;
  estacion_id: string;
  turno_id: string | null;
  ventas_esperadas: number;
  ventas_esperadas_galones: number;
  efectivo: number;
  tarjetas_credito: number;
  tarjetas_debito: number;
  transferencias: number;
  qr: number;
  credito_empresas: number;
  otros: number;
  total_entregado: number;
  diferencia: number;
  resultado: string;
  estado_cuadre: string;
  justificacion: string | null;
  created_at: string;
};

type Estacion = { id: string; nombre: string };

export function ReporteDescuadres({ estaciones, estacionId }: { estaciones: Estacion[]; estacionId: string }) {
  const [loading, setLoading] = useState(true);
  const [cuadres, setCuadres] = useState<Cuadre[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from('est_cuadres').select('*').order('created_at', { ascending: false }).limit(500);
      setCuadres((data as Cuadre[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const estMap = useMemo(() => new Map(estaciones.map((e) => [e.id, e.nombre])), [estaciones]);

  const filtered = useMemo(() => {
    if (estacionId === 'all') return cuadres;
    return cuadres.filter((c) => c.estacion_id === estacionId);
  }, [cuadres, estacionId]);

  const stats = useMemo(() => {
    const correctos = filtered.filter((c) => c.resultado === 'cuadrado' || c.resultado === 'dentro_tolerancia').length;
    const faltantes = filtered.filter((c) => c.resultado === 'faltante').length;
    const sobrantes = filtered.filter((c) => c.resultado === 'sobrante').length;
    const totalFaltantes = filtered.filter((c) => c.resultado === 'faltante').reduce((s, c) => s + Math.abs(Number(c.diferencia) || 0), 0);
    const totalSobrantes = filtered.filter((c) => c.resultado === 'sobrante').reduce((s, c) => s + Math.abs(Number(c.diferencia) || 0), 0);
    return { correctos, faltantes, sobrantes, totalFaltantes, totalSobrantes, total: filtered.length };
  }, [filtered]);

  const handleExport = () => {
    const headers = ['Fecha', 'Estacion', 'Ventas Esperadas', 'Total Entregado', 'Diferencia', 'Resultado', 'Estado', 'Justificacion'];
    const lines = [headers.join(',')];
    filtered.forEach((c) => {
      lines.push([
        c.created_at?.split('T')[0] ?? '',
        `"${estMap.get(c.estacion_id) ?? ''}"`,
        c.ventas_esperadas,
        c.total_entregado,
        c.diferencia,
        c.resultado,
        c.estado_cuadre,
        `"${c.justificacion ?? ''}"`,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_descuadres_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const RESULTADO_CFG: Record<string, { label: string; cls: string; icon: string }> = {
    cuadrado: { label: 'Cuadre correcto', cls: 'bg-emerald-50 text-emerald-700', icon: '🟢' },
    dentro_tolerancia: { label: 'Diferencia menor', cls: 'bg-blue-50 text-blue-700', icon: '🟢' },
    faltante: { label: 'Descuadre importante', cls: 'bg-red-50 text-red-700', icon: '🔴' },
    sobrante: { label: 'Sobrante', cls: 'bg-amber-50 text-amber-700', icon: '🟠' },
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-emerald-50 p-4 text-center"><p className="text-2xl font-bold text-emerald-700">{stats.correctos}</p><p className="text-xs text-emerald-600">Cuadres correctos</p></div>
        <div className="rounded-xl bg-red-50 p-4 text-center"><p className="text-2xl font-bold text-red-700">{stats.faltantes}</p><p className="text-xs text-red-600">Faltantes</p></div>
        <div className="rounded-xl bg-amber-50 p-4 text-center"><p className="text-2xl font-bold text-amber-700">{stats.sobrantes}</p><p className="text-xs text-amber-600">Sobrantes</p></div>
        <div className="rounded-xl bg-slate-100 p-4 text-center"><p className="text-2xl font-bold text-slate-700">{stats.totalFaltantes.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</p><p className="text-xs text-slate-500">Total faltantes</p></div>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs"><Download className="h-3.5 w-3.5" />Exportar</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Scale className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-600">No hay cuadres registrados</p>
          <p className="mt-1 text-xs text-slate-400">Los descuadres de turnos aparecerán aquí.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Estación</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Ventas esperadas</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Total entregado</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Diferencia</th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Estado</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Justificación</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((c) => {
                const cfg = RESULTADO_CFG[c.resultado] ?? { label: c.resultado, cls: 'bg-slate-100 text-slate-600', icon: '⚪' };
                const diff = Number(c.diferencia) || 0;
                return (
                  <tr key={c.id} className={cn('border-t border-slate-100', c.resultado === 'faltante' ? 'bg-red-50/40' : c.resultado === 'sobrante' ? 'bg-amber-50/40' : '')}>
                    <td className="px-3 py-2 text-slate-700">{c.created_at?.split('T')[0] ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{estMap.get(c.estacion_id) ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{Number(c.ventas_esperadas).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{Number(c.total_entregado).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                    <td className={cn('px-3 py-2 text-right font-semibold', diff < 0 ? 'text-red-600' : diff > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                      {diff.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 text-center"><Badge className={cn('text-[10px]', cfg.cls)}>{cfg.icon} {cfg.label}</Badge></td>
                    <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{c.justificacion ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length > 200 && <p className="p-3 text-center text-xs text-slate-400">Mostrando 200 de {filtered.length} registros.</p>}
        </div>
      )}
    </div>
  );
}
