'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Clock, Car } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type Registro = {
  id: string; placa: string; tipo_vehiculo: string; nombre_conductor: string | null;
  espacio: string | null; hora_ingreso: string; hora_salida: string | null;
  tiempo_minutos: number | null; total: number | null; metodo_pago: string | null;
  estado: string; created_at: string;
};

interface Props { registros: Registro[] }

const TIPOS_LABEL: Record<string, string> = {
  automovil: 'Automóvil', motocicleta: 'Motocicleta', bicicleta: 'Bicicleta',
  camioneta: 'Camioneta', camion: 'Camión', '': 'Todos'
};

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function formatTiempo(min: number | null) {
  if (!min) return '—';
  const h = Math.floor(min / 60); const m = min % 60;
  if (h > 0) return `${h}h ${m}m`; return `${m}m`;
}

export function ParqHistorial({ registros }: Props) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');

  const filtered = useMemo(() => {
    return registros.filter((r) => {
      if (busqueda && !r.placa.toLowerCase().includes(busqueda.toLowerCase()) && !(r.nombre_conductor?.toLowerCase().includes(busqueda.toLowerCase()))) return false;
      if (filtroTipo && r.tipo_vehiculo !== filtroTipo) return false;
      if (filtroEstado && r.estado !== filtroEstado) return false;
      if (filtroMetodo && r.metodo_pago !== filtroMetodo) return false;
      if (filtroFecha && !r.hora_ingreso.startsWith(filtroFecha)) return false;
      return true;
    });
  }, [registros, busqueda, filtroTipo, filtroEstado, filtroMetodo, filtroFecha]);

  const totalIngresos = filtered.filter((r) => r.estado === 'pagado').reduce((s, r) => s + (r.total ?? 0), 0);
  const avgTiempo = (() => {
    const pagados = filtered.filter((r) => r.estado === 'pagado' && r.tiempo_minutos);
    if (!pagados.length) return 0;
    return Math.round(pagados.reduce((s, r) => s + (r.tiempo_minutos ?? 0), 0) / pagados.length);
  })();

  if (registros.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft"><Clock className="h-7 w-7 text-slate-300" /></div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">Sin historial</h3>
        <p className="mt-1 text-sm text-slate-400">Los registros aparecerán aquí una vez que comiences a registrar vehículos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{filtered.length}</p>
          <p className="mt-1 text-xs text-slate-500">Registros</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{fmt(totalIngresos)}</p>
          <p className="mt-1 text-xs text-slate-500">Ingresos filtrados</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{formatTiempo(avgTiempo)}</p>
          <p className="mt-1 text-xs text-slate-500">Tiempo promedio</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar placa o conductor…" className="pl-9" />
          </div>
          <input type="date" value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los tipos</SelectItem>
              {Object.entries(TIPOS_LABEL).filter(([k]) => k).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="pagado">Pagado</SelectItem>
              <SelectItem value="anulado">Anulado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Método pago" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="Efectivo">Efectivo</SelectItem>
              <SelectItem value="Tarjeta">Tarjeta</SelectItem>
              <SelectItem value="QR">QR</SelectItem>
              <SelectItem value="Transferencia">Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Placa', 'Tipo', 'Ingreso', 'Salida', 'Tiempo', 'Total', 'Método', 'Estado'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-slate-400">Sin resultados con los filtros aplicados.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-bold text-slate-900">{r.placa}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{TIPOS_LABEL[r.tipo_vehiculo] || r.tipo_vehiculo}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{new Date(r.hora_ingreso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.hora_salida ? new Date(r.hora_salida).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatTiempo(r.tiempo_minutos)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">{r.total !== null ? fmt(r.total) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.metodo_pago || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', r.estado === 'activo' ? 'bg-blue-50 text-blue-600' : r.estado === 'pagado' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500')}>
                      {r.estado.charAt(0).toUpperCase() + r.estado.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
