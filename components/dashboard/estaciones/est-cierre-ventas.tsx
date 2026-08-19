'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Fuel, DollarSign, Layers, Gauge, Droplet, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Estacion } from './est-estaciones';
import type { Isla, Surtidor, Manguera, Producto } from './est-cierre-lecturas';
import type { Cierre } from './est-cierre-detalle';

type Lectura = {
  id: string;
  manguera_id: string;
  producto_id: string | null;
  nombre_manguera: string;
  nombre_surtidor: string;
  nombre_isla: string;
  nombre_producto: string | null;
  color_producto: string;
  galones_vendidos: number | null;
  estado: string;
};

type PrecioHistorial = {
  id: string;
  producto_id: string;
  precio_galon: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
};

function fmtGal(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface Props {
  cierre: Cierre;
  estacion: Estacion;
  islas: Isla[];
  surtidores: Surtidor[];
  mangueras: Manguera[];
  productos: Producto[];
}

export function EstCierreVentas({ cierre, estacion, islas, surtidores, mangueras, productos }: Props) {
  const [loading, setLoading] = useState(true);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [precios, setPrecios] = useState<PrecioHistorial[]>([]);
  const [sinPrecio, setSinPrecio] = useState<string[]>([]);

  const productoMap = useMemo(() => {
    const m: Record<string, Producto> = {};
    productos.forEach((p) => { m[p.id] = p; });
    return m;
  }, [productos]);

  const fetchDatos = useCallback(async () => {
    setLoading(true);
    const [lecRes, preRes] = await Promise.all([
      supabase.from('est_lecturas').select('*').eq('cierre_id', cierre.id).not('galones_vendidos', 'is', null),
      supabase.from('est_precios_combustible').select('*').eq('estacion_id', estacion.id).order('fecha_inicio', { ascending: false }),
    ]);

    const lecturasData = (lecRes.data as Lectura[]) ?? [];
    const preciosData = (preRes.data as PrecioHistorial[]) ?? [];
    setLecturas(lecturasData);
    setPrecios(preciosData);
    setLoading(false);
  }, [cierre.id, estacion.id]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  // Find the price that was vigente on the cierre's fecha for a given producto
  const getPrecioVigente = useCallback((productoId: string | null): PrecioHistorial | null => {
    if (!productoId) return null;
    const fechaCierre = cierre.fecha;
    const candidatos = precios
      .filter((p) => p.producto_id === productoId && p.fecha_inicio <= fechaCierre)
      .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
    return candidatos[0] ?? null;
  }, [precios, cierre.fecha]);

  // Calculate sales per lectura
  const ventasCalculadas = useMemo(() => {
    const sinPrecioList: string[] = [];
    const results = lecturas.map((l) => {
      const precio = getPrecioVigente(l.producto_id);
      const galones = l.galones_vendidos ?? 0;
      if (!precio || precio.precio_galon <= 0) {
        sinPrecioList.push(l.nombre_producto ?? 'Sin producto');
      }
      const venta = precio ? galones * precio.precio_galon : 0;
      return {
        ...l,
        precio_galon: precio?.precio_galon ?? 0,
        venta,
        tienePrecio: !!precio && precio.precio_galon > 0,
      };
    });
    if (sinPrecioList.length > 0) setSinPrecio([...new Set(sinPrecioList)]);
    else setSinPrecio([]);
    return results;
  }, [lecturas, getPrecioVigente]);

  // Aggregations
  const ventaTotal = useMemo(() => ventasCalculadas.reduce((s, v) => s + v.venta, 0), [ventasCalculadas]);
  const galonesTotal = useMemo(() => ventasCalculadas.reduce((s, v) => s + (v.galones_vendidos ?? 0), 0), [ventasCalculadas]);

  const ventaPorProducto = useMemo(() => {
    const m: Record<string, { nombre: string; color: string; galones: number; venta: number }> = {};
    ventasCalculadas.forEach((v) => {
      const key = v.nombre_producto ?? 'Sin producto';
      if (!m[key]) m[key] = { nombre: key, color: v.color_producto ?? '#94a3b8', galones: 0, venta: 0 };
      m[key].galones += v.galones_vendidos ?? 0;
      m[key].venta += v.venta;
    });
    return Object.values(m).sort((a, b) => b.venta - a.venta);
  }, [ventasCalculadas]);

  const ventaPorIsla = useMemo(() => {
    const m: Record<string, { nombre: string; galones: number; venta: number }> = {};
    ventasCalculadas.forEach((v) => {
      const key = v.nombre_isla ?? 'Sin isla';
      if (!m[key]) m[key] = { nombre: key, galones: 0, venta: 0 };
      m[key].galones += v.galones_vendidos ?? 0;
      m[key].venta += v.venta;
    });
    return Object.values(m).sort((a, b) => b.venta - a.venta);
  }, [ventasCalculadas]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (lecturas.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
            <Fuel className="h-8 w-8 text-slate-300" />
          </div>
          <h3 className="mt-5 text-base font-bold text-slate-700">Sin lecturas registradas</h3>
          <p className="mt-2 text-sm text-slate-500">Registra las lecturas de mangueras primero. Las ventas se calculan automáticamente.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Warning: products without price */}
      {sinPrecio.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Combustibles sin precio configurado</p>
            <p className="mt-1 text-xs text-amber-700">
              Los siguientes productos no tienen precio vigente para la fecha del cierre ({new Date(cierre.fecha + 'T00:00:00').toLocaleDateString('es-CO')}): <strong>{sinPrecio.join(', ')}</strong>. Configura precios en la sección de Precios.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5 bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <DollarSign className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{fmtMoney(ventaTotal)}</p>
          <p className="mt-1 text-xs text-slate-600">Venta total del turno</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Fuel className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{fmtGal(galonesTotal)} <span className="text-sm font-normal text-slate-400">gal</span></p>
          <p className="mt-1 text-xs text-slate-500">Galones vendidos</p>
        </Card>
        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{galonesTotal > 0 ? fmtMoney(ventaTotal / galonesTotal) : '—'}</p>
          <p className="mt-1 text-xs text-slate-500">Precio promedio / galón</p>
        </Card>
      </div>

      {/* Sales by product */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">Venta por combustible</h3>
        </div>
        <div className="space-y-3">
          {ventaPorProducto.map((p) => (
            <div key={p.nombre} className="flex items-center gap-3 rounded-xl border border-slate-100 p-4">
              <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{p.nombre}</p>
                <p className="text-xs text-slate-500">{fmtGal(p.galones)} galones</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-slate-900">{fmtMoney(p.venta)}</p>
                <p className="text-[10px] text-slate-400">{ventaTotal > 0 ? `${((p.venta / ventaTotal) * 100).toFixed(1)}%` : ''}</p>
              </div>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-700">Total</span>
            <span className="text-lg font-bold text-amber-700">{fmtMoney(ventaTotal)}</span>
          </div>
        </div>
      </Card>

      {/* Sales by island → surtidor → manguera detail */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Detalle por isla</h3>
        </div>
        <div className="space-y-4">
          {ventaPorIsla.map((isla) => {
            const surtsDeIsla = [...new Set(ventasCalculadas.filter((v) => v.nombre_isla === isla.nombre).map((v) => v.nombre_surtidor))];
            return (
              <div key={isla.nombre} className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50/80 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                      <Layers className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">{isla.nombre}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{fmtMoney(isla.venta)}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {surtsDeIsla.map((surtNombre) => {
                    const mangsDeSurt = ventasCalculadas.filter((v) => v.nombre_isla === isla.nombre && v.nombre_surtidor === surtNombre);
                    const surtVenta = mangsDeSurt.reduce((s, v) => s + v.venta, 0);
                    return (
                      <div key={surtNombre} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Gauge className="h-3.5 w-3.5 text-violet-500" />
                          <span className="text-xs font-semibold text-slate-700">{surtNombre}</span>
                          <span className="ml-auto text-xs font-bold text-slate-900">{fmtMoney(surtVenta)}</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {mangsDeSurt.map((m) => (
                            <div key={m.id} className="rounded-lg border border-slate-100 p-2.5 bg-white">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color_producto }} />
                                <span className="text-[11px] font-semibold text-slate-700">{m.nombre_manguera}</span>
                                <span className="text-[10px] text-slate-400">{m.nombre_producto}</span>
                              </div>
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-slate-500">{fmtGal(m.galones_vendidos ?? 0)} gal</span>
                                <span className="text-slate-500">× {fmtMoney(m.precio_galon)}</span>
                                <span className={cn('font-bold', m.tienePrecio ? 'text-emerald-700' : 'text-red-600')}>
                                  {fmtMoney(m.venta)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
