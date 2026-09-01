'use client';

import { useState, useEffect, useMemo } from 'react';
import { Truck, Download, Loader2, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

type Carrotanque = {
  id: string;
  estacion_id: string;
  tanque_id: string | null;
  fecha: string;
  hora: string | null;
  proveedor: string | null;
  numero_factura: string | null;
  numero_carrotanque: string | null;
  conductor: string | null;
  tipo_combustible: string | null;
  cantidad_galones: number;
  observaciones: string | null;
  source: string;
};

type Estacion = { id: string; nombre: string };
type Tanque = { id: string; nombre: string; estacion_id: string };

export function ReporteCarrotanques({ estaciones, estacionId }: { estaciones: Estacion[]; estacionId: string }) {
  const [loading, setLoading] = useState(true);
  const [carrots, setCarrots] = useState<Carrotanque[]>([]);
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [carrotRes, tanqRes] = await Promise.all([
        supabase.from('est_carrotanques').select('*').order('fecha', { ascending: false }).limit(1000),
        supabase.from('est_tanques').select('id, nombre, estacion_id'),
      ]);
      setCarrots((carrotRes.data as Carrotanque[]) ?? []);
      setTanques((tanqRes.data as Tanque[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const estMap = useMemo(() => new Map(estaciones.map((e) => [e.id, e.nombre])), [estaciones]);
  const tanqueMap = useMemo(() => new Map(tanques.map((t) => [t.id, t.nombre])), [tanques]);

  const filtered = useMemo(() => {
    return carrots.filter((c) => {
      if (estacionId !== 'all' && c.estacion_id !== estacionId) return false;
      if (fechaInicio && c.fecha < fechaInicio) return false;
      if (fechaFin && c.fecha > fechaFin) return false;
      return true;
    });
  }, [carrots, estacionId, fechaInicio, fechaFin]);

  const totalGalones = filtered.reduce((s, c) => s + (Number(c.cantidad_galones) || 0), 0);

  const handleExport = () => {
    const headers = ['Fecha', 'Hora', 'Estacion', 'Tanque', 'Combustible', 'Proveedor', 'Documento', 'Carrotanque', 'Conductor', 'Galones Recibidos', 'Observaciones', 'Origen'];
    const lines = [headers.join(',')];
    filtered.forEach((c) => {
      lines.push([
        c.fecha,
        c.hora ?? '',
        `"${estMap.get(c.estacion_id) ?? ''}"`,
        `"${tanqueMap.get(c.tanque_id ?? '') ?? ''}"`,
        `"${c.tipo_combustible ?? ''}"`,
        `"${c.proveedor ?? ''}"`,
        `"${c.numero_factura ?? ''}"`,
        `"${c.numero_carrotanque ?? ''}"`,
        `"${c.conductor ?? ''}"`,
        c.cantidad_galones,
        `"${c.observaciones ?? ''}"`,
        c.source,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_carrotanques_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Fecha inicial</Label>
          <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Fecha final</Label>
          <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="flex items-end justify-end">
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 text-xs"><Download className="h-3.5 w-3.5" />Exportar</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="rounded-xl bg-cyan-50 p-4 text-center"><p className="text-2xl font-bold text-cyan-700">{totalGalones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</p><p className="text-xs text-cyan-600">Galones recibidos</p></div>
        <div className="rounded-xl bg-blue-50 p-4 text-center"><p className="text-2xl font-bold text-blue-700">{filtered.length}</p><p className="text-xs text-blue-600">Entradas registradas</p></div>
        <div className="rounded-xl bg-slate-100 p-4 text-center"><p className="text-2xl font-bold text-slate-700">{new Set(filtered.map((c) => c.proveedor).filter(Boolean)).size}</p><p className="text-xs text-slate-500">Proveedores</p></div>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Database className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-600">No hay entradas de carrotanques</p>
          <p className="mt-1 text-xs text-slate-400">Las entradas de combustible registradas aparecerán aquí.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Hora</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Estación</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Tanque</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Combustible</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Proveedor</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Documento</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Galones</th>
                <th className="px-3 py-2.5 text-center font-semibold text-slate-600">Origen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-slate-700">{c.fecha}</td>
                  <td className="px-3 py-2 text-slate-600">{c.hora ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{estMap.get(c.estacion_id) ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{tanqueMap.get(c.tanque_id ?? '') ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{c.tipo_combustible ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-700">{c.proveedor ?? '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{c.numero_factura ?? c.numero_carrotanque ?? '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(c.cantidad_galones).toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2 text-center"><span className={c.source === 'imported' ? 'text-blue-600 text-[10px]' : 'text-slate-400 text-[10px]'}>{c.source === 'imported' ? 'Importado' : 'Nativo'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && <p className="p-3 text-center text-xs text-slate-400">Mostrando 200 de {filtered.length} registros.</p>}
        </div>
      )}
    </div>
  );
}
