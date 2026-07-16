'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';

type Registro = {
  id: string; placa: string; tipo_vehiculo: string; hora_ingreso: string;
  hora_salida: string | null; tiempo_minutos: number | null;
  total: number | null; estado: string;
};

interface Props { registros: Registro[]; totalCupos: number }

const PIE_COLORS = ['hsl(221 83% 53%)', 'hsl(160 84% 39%)', 'hsl(30 80% 55%)', 'hsl(280 65% 60%)', 'hsl(340 75% 55%)'];
const TIPOS_LABEL: Record<string, string> = {
  automovil: 'Automóvil', motocicleta: 'Motocicleta', bicicleta: 'Bicicleta',
  camioneta: 'Camioneta', camion: 'Camión',
};

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

export function ParqEstadisticas({ registros, totalCupos }: Props) {
  const pagados = registros.filter((r) => r.estado === 'pagado');

  const stats = useMemo(() => {
    const now = new Date();

    // Daily (last 7 days)
    const days7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString('es-CO', { weekday: 'short' });
      const dateStr = d.toISOString().split('T')[0];
      const dayRegs = pagados.filter((r) => r.hora_ingreso.startsWith(dateStr));
      return { label, count: dayRegs.length, ingresos: dayRegs.reduce((s, r) => s + (r.total ?? 0), 0) };
    });

    // Monthly (last 6 months)
    const months6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const label = d.toLocaleDateString('es-CO', { month: 'short' });
      const month = d.getMonth(); const year = d.getFullYear();
      const mRegs = pagados.filter((r) => { const rd = new Date(r.hora_ingreso); return rd.getMonth() === month && rd.getFullYear() === year; });
      return { label, count: mRegs.length, ingresos: mRegs.reduce((s, r) => s + (r.total ?? 0), 0) };
    });

    // Horas pico (current month)
    const horas: Record<number, number> = {};
    registros.forEach((r) => { const h = new Date(r.hora_ingreso).getHours(); horas[h] = (horas[h] || 0) + 1; });
    const horasChart = Array.from({ length: 24 }, (_, h) => ({ label: `${h}:00`, count: horas[h] || 0 })).filter((h) => h.count > 0);

    // Tipos
    const tiposMap: Record<string, number> = {};
    pagados.forEach((r) => { tiposMap[r.tipo_vehiculo] = (tiposMap[r.tipo_vehiculo] || 0) + 1; });
    const tiposChart = Object.entries(tiposMap).map(([tipo, count]) => ({ name: TIPOS_LABEL[tipo] || tipo, value: count })).sort((a, b) => b.value - a.value);

    // Tiempo promedio
    const conTiempo = pagados.filter((r) => r.tiempo_minutos);
    const avgMin = conTiempo.length > 0 ? Math.round(conTiempo.reduce((s, r) => s + (r.tiempo_minutos ?? 0), 0) / conTiempo.length) : 0;

    // Ocupacion % hoy
    const todayStr = now.toISOString().split('T')[0];
    const activosHoy = registros.filter((r) => r.estado === 'activo' && r.hora_ingreso.startsWith(todayStr)).length;
    const ocupacion = totalCupos > 0 ? Math.min(100, Math.round((activosHoy / totalCupos) * 100)) : 0;

    return { days7, months6, horasChart, tiposChart, avgMin, ocupacion };
  }, [registros, pagados, totalCupos]);

  if (registros.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
        <h3 className="text-base font-semibold text-slate-700">Sin estadísticas</h3>
        <p className="mt-1 text-sm text-slate-400">Registra vehículos para ver gráficas y estadísticas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-slate-900">{pagados.length}</p>
          <p className="mt-1 text-xs text-slate-500">Vehículos atendidos</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.avgMin > 0 ? `${Math.floor(stats.avgMin / 60)}h ${stats.avgMin % 60}m` : '—'}</p>
          <p className="mt-1 text-xs text-slate-500">Permanencia promedio</p>
        </Card>
        <Card className="p-5 text-center col-span-2 md:col-span-1">
          <p className="text-2xl font-bold text-blue-600">{stats.ocupacion}%</p>
          <p className="mt-1 text-xs text-slate-500">Ocupación actual</p>
        </Card>
      </div>

      {/* Daily income + count */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Ingresos diarios — últimos 7 días</h3>
          <p className="mb-4 text-xs text-slate-500">Total cobrado por día</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.days7}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Vehículos por día — últimos 7 días</h3>
          <p className="mb-4 text-xs text-slate-500">Cantidad de vehículos atendidos</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.days7}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
              <Line type="monotone" dataKey="count" name="Vehículos" stroke="hsl(221 83% 53%)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Monthly + Horas pico */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Ingresos mensuales — 6 meses</h3>
          <p className="mb-4 text-xs text-slate-500">Evolución de ingresos por mes</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.months6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Horas pico</h3>
          <p className="mb-4 text-xs text-slate-500">Concentración de ingresos por hora del día</p>
          {stats.horasChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.horasChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                <Bar dataKey="count" name="Vehículos" fill="hsl(30 80% 55%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="pt-10 text-center text-sm text-slate-400">Sin datos de horas</p>}
        </Card>
      </div>

      {/* Tipos de vehículos */}
      {stats.tiposChart.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Tipos de vehículos</h3>
          <p className="mb-4 text-xs text-slate-500">Distribución por tipo</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={stats.tiposChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={35} paddingAngle={2}>
                  {stats.tiposChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center space-y-3">
              {stats.tiposChart.map((t, i) => {
                const pct = pagados.length > 0 ? Math.round((t.value / pagados.length) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="flex-1 text-sm text-slate-700">{t.name}</span>
                    <span className="text-sm font-semibold text-slate-900">{t.value} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
