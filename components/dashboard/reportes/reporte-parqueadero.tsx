'use client';

import { useState, useEffect, useMemo } from 'react';
import { Car, Download, Loader2, Database, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

type Vehiculo = {
  id: string;
  placa: string;
  tipo_vehiculo: string;
  nombre_conductor: string | null;
  hora_ingreso: string;
  estado: string;
  observaciones: string | null;
};

type Historial = {
  id: string;
  placa: string;
  tipo_vehiculo: string;
  nombre_conductor: string | null;
  hora_ingreso: string;
  hora_salida: string | null;
  tiempo_minutos: number | null;
  total: number;
  metodo_pago: string | null;
  observaciones: string | null;
  created_at: string;
};

export function ReporteParqueadero({ estacionId }: { estacionId: string }) {
  const [loading, setLoading] = useState(true);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [vehRes, histRes] = await Promise.all([
        supabase.from('parqueadero_vehiculos').select('*').order('created_at', { ascending: false }),
        supabase.from('parqueadero_historial').select('*').order('created_at', { ascending: false }).limit(1000),
      ]);
      setVehiculos((vehRes.data as Vehiculo[]) ?? []);
      setHistorial((histRes.data as Historial[]) ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const vehiculosDentro = useMemo(() => vehiculos.filter((v) => v.estado === 'dentro'), [vehiculos]);

  const filteredHistorial = useMemo(() => {
    return historial.filter((h) => {
      const fecha = h.created_at?.split('T')[0] ?? '';
      if (fechaInicio && fecha < fechaInicio) return false;
      if (fechaFin && fecha > fechaFin) return false;
      return true;
    });
  }, [historial, fechaInicio, fechaFin]);

  const stats = useMemo(() => {
    const totalIngresos = filteredHistorial.reduce((s, h) => s + (Number(h.total) || 0), 0);
    const tiempoPromedio = filteredHistorial.length > 0
      ? filteredHistorial.reduce((s, h) => s + (Number(h.tiempo_minutos) || 0), 0) / filteredHistorial.length
      : 0;
    return {
      vehiculosDentro: vehiculosDentro.length,
      totalIngresos,
      totalRegistros: filteredHistorial.length,
      tiempoPromedio,
    };
  }, [filteredHistorial, vehiculosDentro]);

  const handleExport = () => {
    const headers = ['Placa', 'Tipo', 'Conductor', 'Hora Ingreso', 'Hora Salida', 'Tiempo (min)', 'Total', 'Metodo Pago', 'Observaciones', 'Fecha'];
    const lines = [headers.join(',')];
    filteredHistorial.forEach((h) => {
      lines.push([
        `"${h.placa}"`,
        `"${h.tipo_vehiculo}"`,
        `"${h.nombre_conductor ?? ''}"`,
        h.hora_ingreso ?? '',
        h.hora_salida ?? '',
        h.tiempo_minutos ?? '',
        h.total,
        `"${h.metodo_pago ?? ''}"`,
        `"${h.observaciones ?? ''}"`,
        h.created_at?.split('T')[0] ?? '',
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_parqueadero_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-emerald-50 p-4 text-center"><p className="text-2xl font-bold text-emerald-700">{stats.vehiculosDentro}</p><p className="text-xs text-emerald-600">Dentro ahora</p></div>
        <div className="rounded-xl bg-blue-50 p-4 text-center"><p className="text-2xl font-bold text-blue-700">{stats.totalRegistros}</p><p className="text-xs text-blue-600">Registros</p></div>
        <div className="rounded-xl bg-amber-50 p-4 text-center"><p className="text-2xl font-bold text-amber-700">{stats.tiempoPromedio.toFixed(0)}</p><p className="text-xs text-amber-600">Min promedio</p></div>
        <div className="rounded-xl bg-slate-100 p-4 text-center"><p className="text-2xl font-bold text-slate-700">{stats.totalIngresos.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</p><p className="text-xs text-slate-500">Ingresos</p></div>
      </div>

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

      {/* Vehicles currently inside */}
      {vehiculosDentro.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Vehículos actualmente dentro</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Placa</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Tipo</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Conductor</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Hora ingreso</th>
                </tr>
              </thead>
              <tbody>
                {vehiculosDentro.map((v) => (
                  <tr key={v.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700 font-medium">{v.placa}</td>
                    <td className="px-3 py-2 text-slate-700">{v.tipo_vehiculo}</td>
                    <td className="px-3 py-2 text-slate-700">{v.nombre_conductor ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{v.hora_ingreso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* History */}
      {filteredHistorial.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Car className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-600">No hay registros de parqueadero</p>
          <p className="mt-1 text-xs text-slate-400">Los registros de ingreso y salida aparecerán aquí.</p>
        </Card>
      ) : (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Historial</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Fecha</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Placa</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Conductor</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Ingreso</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Salida</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Tiempo</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Total</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Pago</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistorial.slice(0, 200).map((h) => (
                  <tr key={h.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{h.created_at?.split('T')[0] ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-700 font-medium">{h.placa}</td>
                    <td className="px-3 py-2 text-slate-700">{h.nombre_conductor ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{h.hora_ingreso ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{h.hora_salida ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{h.tiempo_minutos ? `${h.tiempo_minutos} min` : '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{Number(h.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</td>
                    <td className="px-3 py-2 text-slate-600">{h.metodo_pago ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredHistorial.length > 200 && <p className="mt-2 text-center text-xs text-slate-400">Mostrando 200 de {filteredHistorial.length} registros.</p>}
        </Card>
      )}
    </div>
  );
}
