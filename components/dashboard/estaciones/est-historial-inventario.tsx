'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, History, Filter, Fuel, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Tanque } from '@/components/dashboard/estaciones/est-tanques';
import type { Producto } from '@/components/dashboard/estaciones/est-productos';

interface Props {
  estacionId: string;
  estacionNombre: string;
  tanques: Tanque[];
  productos: Producto[];
}

type Movimiento = {
  id: string;
  fecha: string;
  hora: string | null;
  tanque_id: string;
  producto_id: string | null;
  tipo: string;
  concepto: string;
  galones: number;
  nivel_anterior: number;
  nivel_posterior: number;
  responsable: string | null;
  observaciones: string | null;
};

type InventarioDiario = {
  id: string;
  fecha: string;
  hora: string | null;
  tanque_id: string;
  nivel_galones: number;
  tipo: string;
  responsable: string | null;
  observaciones: string | null;
};

export function EstHistorialInventario({ estacionId, estacionNombre, tanques, productos }: Props) {
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [invDiario, setInvDiario] = useState<InventarioDiario[]>([]);
  const [filtroTanque, setFiltroTanque] = useState('all');
  const [filtroCombustible, setFiltroCombustible] = useState('all');
  const [filtroFechaIni, setFiltroFechaIni] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [tab, setTab] = useState<'movimientos' | 'diario'>('movimientos');

  const fetchData = useCallback(async () => {
    setLoading(true);
    let movQuery = supabase.from('est_movimientos_inventario').select('*').eq('estacion_id', estacionId);
    let invQuery = supabase.from('est_inventario_diario').select('*').eq('estacion_id', estacionId);
    if (filtroTanque !== 'all') { movQuery = movQuery.eq('tanque_id', filtroTanque); invQuery = invQuery.eq('tanque_id', filtroTanque); }
    if (filtroFechaIni) { movQuery = movQuery.gte('fecha', filtroFechaIni); invQuery = invQuery.gte('fecha', filtroFechaIni); }
    if (filtroFechaFin) { movQuery = movQuery.lte('fecha', filtroFechaFin); invQuery = invQuery.lte('fecha', filtroFechaFin); }
    movQuery = movQuery.order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(200);
    invQuery = invQuery.order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(200);
    const [movRes, invRes] = await Promise.all([movQuery, invQuery]);
    setMovimientos((movRes.data as Movimiento[]) ?? []);
    setInvDiario((invRes.data as InventarioDiario[]) ?? []);
    setLoading(false);
  }, [estacionId, filtroTanque, filtroFechaIni, filtroFechaFin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getTanque = (id: string) => tanques.find((t) => t.id === id);
  const getProducto = (id: string | null) => productos.find((p) => p.id === id);

  const movFiltered = useMemo(() => {
    if (filtroCombustible === 'all') return movimientos;
    return movimientos.filter((m) => {
      const t = getTanque(m.tanque_id);
      return t?.producto_id === filtroCombustible;
    });
  }, [movimientos, filtroCombustible, tanques]);

  const invFiltered = useMemo(() => {
    if (filtroCombustible === 'all') return invDiario;
    return invDiario.filter((i) => {
      const t = getTanque(i.tanque_id);
      return t?.producto_id === filtroCombustible;
    });
  }, [invDiario, filtroCombustible, tanques]);

  const tipoBadge = (tipo: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      entrada: { label: 'Entrada', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      salida: { label: 'Salida', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
      ajuste: { label: 'Ajuste', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    };
    return map[tipo] ?? { label: tipo, cls: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Historial de Inventario</h2>
        <p className="text-sm text-slate-500">{estacionNombre} — Movimientos y registros diarios</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Filter className="h-3.5 w-3.5" />Filtros:</div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase text-slate-400">Tanque</label>
            <Select value={filtroTanque} onValueChange={setFiltroTanque}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tanques.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase text-slate-400">Combustible</label>
            <Select value={filtroCombustible} onValueChange={setFiltroCombustible}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase text-slate-400">Desde</label>
            <Input type="date" value={filtroFechaIni} onChange={(e) => setFiltroFechaIni(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase text-slate-400">Hasta</label>
            <Input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} className="w-36 h-8 text-xs" />
          </div>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={fetchData}><Search className="h-3 w-3" />Aplicar</Button>
        </div>
      </Card>

      <div className="flex gap-2 border-b border-slate-200">
        <button onClick={() => setTab('movimientos')} className={cn('px-4 py-2 text-sm font-medium transition-colors', tab === 'movimientos' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-slate-500 hover:text-slate-700')}>Movimientos</button>
        <button onClick={() => setTab('diario')} className={cn('px-4 py-2 text-sm font-medium transition-colors', tab === 'diario' ? 'border-b-2 border-amber-500 text-amber-600' : 'text-slate-500 hover:text-slate-700')}>Inventario Diario</button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
      ) : tab === 'movimientos' ? (
        movFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <History className="h-12 w-12 text-slate-200" />
            <p className="mt-4 text-base font-semibold text-slate-600">No hay movimientos</p>
          </div>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Tanque</th>
                    <th className="px-4 py-3">Combustible</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Galones</th>
                    <th className="px-4 py-3 text-right">Nivel Ant.</th>
                    <th className="px-4 py-3 text-right">Nivel Post.</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3">Observaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {movFiltered.map((m) => {
                    const t = getTanque(m.tanque_id);
                    const prod = getProducto(t?.producto_id ?? null);
                    const badge = tipoBadge(m.tipo);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-xs text-slate-700">{m.fecha}{m.hora ? ` ${m.hora}` : ''}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{t?.nombre ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-700">{prod?.nombre ?? '—'}</td>
                        <td className="px-4 py-3"><span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold', badge.cls)}>{badge.label}</span></td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{m.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right text-slate-500">{m.nivel_anterior.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right text-slate-700">{m.nivel_posterior.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{m.responsable ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-32 truncate">{m.observaciones ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : invFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <History className="h-12 w-12 text-slate-200" />
          <p className="mt-4 text-base font-semibold text-slate-600">No hay registros diarios</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50">
                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tanque</th>
                  <th className="px-4 py-3">Combustible</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Nivel (gal)</th>
                  <th className="px-4 py-3">Responsable</th>
                  <th className="px-4 py-3">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invFiltered.map((i) => {
                  const t = getTanque(i.tanque_id);
                  const prod = getProducto(t?.producto_id ?? null);
                  return (
                    <tr key={i.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-xs text-slate-700">{i.fecha}{i.hora ? ` ${i.hora}` : ''}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{t?.nombre ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{prod?.nombre ?? '—'}</td>
                      <td className="px-4 py-3"><span className={cn('inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold', i.tipo === 'inicial' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200')}>{i.tipo === 'inicial' ? 'Inicial' : 'Final'}</span></td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{i.nivel_galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{i.responsable ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 max-w-32 truncate">{i.observaciones ?? '—'}</td>
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
