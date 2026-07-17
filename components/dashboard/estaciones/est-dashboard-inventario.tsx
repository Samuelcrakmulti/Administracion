'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, Fuel, TrendingDown, TrendingUp, Truck, Gauge, AlertTriangle, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Tanque } from '@/components/dashboard/estaciones/est-tanques';
import type { Producto } from '@/components/dashboard/estaciones/est-productos';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';

interface Props {
  estacionId: string;
  estacionNombre: string;
  tanques: Tanque[];
  productos: Producto[];
}

export function EstDashboardInventario({ estacionId, estacionNombre, tanques, productos }: Props) {
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [carrotanques, setCarrotanques] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);

  const hoy = new Date().toISOString().split('T')[0];
  const hace7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [movRes, carRes, alertRes] = await Promise.all([
      supabase.from('est_movimientos_inventario').select('*').eq('estacion_id', estacionId).order('fecha', { ascending: false }).limit(500),
      supabase.from('est_carrotanques').select('*').eq('estacion_id', estacionId).order('fecha', { ascending: false }).limit(200),
      supabase.from('est_alertas_inventario').select('*').eq('estacion_id', estacionId).order('fecha', { ascending: false }).limit(50),
    ]);
    setMovimientos(movRes.data ?? []);
    setCarrotanques(carRes.data ?? []);
    setAlertas(alertRes.data ?? []);
    setLoading(false);
  }, [estacionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getProducto = (id: string | null) => productos.find((p) => p.id === id);

  const kpis = useMemo(() => {
    const totalCapacidad = tanques.reduce((s, t) => s + t.capacidad_maxima_galones, 0);
    const totalActual = tanques.reduce((s, t) => s + t.nivel_actual_galones, 0);
    const totalDisponible = totalCapacidad - totalActual;
    const pctUtilizado = totalCapacidad > 0 ? (totalActual / totalCapacidad) * 100 : 0;

    const galonesHoy = movimientos
      .filter((m) => m.fecha === hoy && m.tipo === 'salida')
      .reduce((s, m) => s + (m.galones || 0), 0);
    const galonesRecibidosHoy = carrotanques
      .filter((c) => c.fecha === hoy)
      .reduce((s, c) => s + (c.cantidad_galones || 0), 0);

    const entradasHoy = carrotanques.filter((c) => c.fecha === hoy).length;

    const consumo7dias = movimientos
      .filter((m) => m.fecha >= hace7 && m.tipo === 'salida')
      .reduce((s, m) => s + (m.galones || 0), 0);
    const consumoPromedio = consumo7dias / 7;
    const autonomia = consumoPromedio > 0 ? totalActual / consumoPromedio : 0;

    return { totalCapacidad, totalActual, totalDisponible, pctUtilizado, galonesHoy, galonesRecibidosHoy, entradasHoy, consumoPromedio, autonomia };
  }, [tanques, movimientos, carrotanques, hoy, hace7]);

  const porTanque = useMemo(() => tanques.map((t) => {
    const prod = getProducto(t.producto_id);
    return {
      nombre: t.nombre,
      combustible: prod?.nombre ?? 'N/A',
      color: prod?.color ?? '#94a3b8',
      actual: t.nivel_actual_galones,
      capacidad: t.capacidad_maxima_galones,
      disponible: t.capacidad_maxima_galones - t.nivel_actual_galones,
      pct: t.capacidad_maxima_galones > 0 ? (t.nivel_actual_galones / t.capacidad_maxima_galones) * 100 : 0,
    };
  }), [tanques, productos]);

  const porCombustible = useMemo(() => {
    const map: Record<string, { nombre: string; color: string; galones: number; capacidad: number }> = {};
    tanques.forEach((t) => {
      const prod = getProducto(t.producto_id);
      const key = prod?.nombre ?? 'Sin producto';
      if (!map[key]) map[key] = { nombre: key, color: prod?.color ?? '#94a3b8', galones: 0, capacidad: 0 };
      map[key].galones += t.nivel_actual_galones;
      map[key].capacidad += t.capacidad_maxima_galones;
    });
    return Object.values(map);
  }, [tanques, productos]);

  const consumoSemanal = useMemo(() => {
    const dias: Record<string, { fecha: string; consumo: number; entradas: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      dias[key] = { fecha: key.slice(5), consumo: 0, entradas: 0 };
    }
    movimientos.forEach((m) => {
      if (m.fecha >= hace7 && m.tipo === 'salida' && dias[m.fecha]) dias[m.fecha].consumo += m.galones || 0;
    });
    carrotanques.forEach((c) => {
      if (c.fecha >= hace7 && dias[c.fecha]) dias[c.fecha].entradas += c.cantidad_galones || 0;
    });
    return Object.values(dias);
  }, [movimientos, carrotanques, hace7]);

  const consumoMensual = useMemo(() => {
    const dias: Record<string, { fecha: string; consumo: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      dias[key] = { fecha: key.slice(5), consumo: 0 };
    }
    movimientos.forEach((m) => {
      if (m.fecha >= hace30 && m.tipo === 'salida' && dias[m.fecha]) dias[m.fecha].consumo += m.galones || 0;
    });
    return Object.values(dias);
  }, [movimientos, hace30]);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div>;

  const KpiCard = ({ value, label, icon, color, sub }: { value: string; label: string; icon: React.ReactNode; color: string; sub?: string }) => {
    const cm: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600', violet: 'bg-violet-50 text-violet-600', slate: 'bg-slate-100 text-slate-600', orange: 'bg-orange-50 text-orange-600' };
    return (
      <Card className="p-5">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cm[color] || 'bg-slate-100')}>{icon}</div>
        <p className="mt-4 text-2xl font-bold text-slate-900">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Dashboard de Inventario</h2>
        <p className="text-sm text-slate-500">{estacionNombre}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard value={`${kpis.totalActual.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`} label="Inventario total (gal)" icon={<Fuel className="h-5 w-5" />} color="blue" sub={`de ${kpis.totalCapacidad.toLocaleString('es-CO')} gal`} />
        <KpiCard value={`${kpis.pctUtilizado.toFixed(1)}%`} label="Capacidad utilizada" icon={<Gauge className="h-5 w-5" />} color="violet" sub={`${kpis.totalDisponible.toLocaleString('es-CO', { maximumFractionDigits: 0 })} gal disponibles`} />
        <KpiCard value={`${kpis.galonesHoy.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`} label="Galones vendidos hoy" icon={<TrendingDown className="h-5 w-5" />} color="amber" />
        <KpiCard value={`+${kpis.galonesRecibidosHoy.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`} label="Galones recibidos hoy" icon={<TrendingUp className="h-5 w-5" />} color="emerald" sub={`${kpis.entradasHoy} entrada${kpis.entradasHoy !== 1 ? 's' : ''}`} />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard value={`${kpis.consumoPromedio.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`} label="Consumo promedio diario (gal)" icon={<TrendingDown className="h-5 w-5" />} color="orange" sub="últimos 7 días" />
        <KpiCard value={kpis.autonomia > 0 ? `${kpis.autonomia.toFixed(1)} días` : '—'} label="Autonomía estimada" icon={<Calendar className="h-5 w-5" />} color="slate" />
        <KpiCard value={String(tanques.length)} label="Tanques activos" icon={<Fuel className="h-5 w-5" />} color="blue" />
        <KpiCard value={String(alertas.filter((a) => !a.atendida).length)} label="Alertas activas" icon={<AlertTriangle className="h-5 w-5" />} color="red" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Inventario por Tanque</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={porTanque}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="nombre" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="actual" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Actual (gal)" />
              <Bar dataKey="disponible" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Disponible (gal)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Distribución por Combustible</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={porCombustible} dataKey="galones" nameKey="nombre" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.nombre}: ${e.galones.toFixed(0)}`}>
                {porCombustible.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Comparativo Semanal (Consumo vs Entradas)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={consumoSemanal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="consumo" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Consumo (gal)" />
              <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas (gal)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Consumo Mensual (30 días)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={consumoMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="consumo" stroke="#3b82f6" strokeWidth={2} dot={false} name="Consumo (gal)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tanques detail */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-900">Estado de Tanques</h3>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {porTanque.map((t) => (
            <div key={t.nombre} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: t.color }} />
                  <span className="text-sm font-bold text-slate-900">{t.nombre}</span>
                </div>
                <span className={cn('text-xs font-bold', t.pct < 10 ? 'text-red-600' : t.pct < 30 ? 'text-amber-600' : 'text-emerald-600')}>{t.pct.toFixed(1)}%</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{t.combustible}</p>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={cn('h-full rounded-full transition-all', t.pct < 10 ? 'bg-red-500' : t.pct < 30 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(t.pct, 100)}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-slate-400">
                <span>{t.actual.toLocaleString('es-CO', { maximumFractionDigits: 0 })} gal</span>
                <span>Cap. {t.capacidad.toLocaleString('es-CO')} gal</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
