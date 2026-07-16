'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';

type Empleado = { id: string; nombre: string; apellido: string; cargo: string; salario: number; estado: string };
type Asistencia = { empleado_id: string; fecha: string; horas_trabajadas: number | null; estado: string };
type Nomina = { mes: number; anio: number; total: number; estado: string };

const PIE_COLORS = ['hsl(221 83% 53%)', 'hsl(160 84% 39%)', 'hsl(280 65% 60%)', 'hsl(30 80% 55%)', 'hsl(340 75% 55%)'];

const MESES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function fmt(v: number) { return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }); }

interface Props {
  empleados: Empleado[];
  asistencias: Asistencia[];
  nominas: Nomina[];
}

export function TalentoEstadisticas({ empleados, asistencias, nominas }: Props) {
  const stats = useMemo(() => {
    const now = new Date();

    // Last 7 days attendance + hours
    const days7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const day = asistencias.filter((a) => a.fecha === dateStr);
      const presentes = day.filter((a) => a.estado !== 'ausente').length;
      const horas = day.reduce((s, a) => s + (a.horas_trabajadas ?? 0), 0);
      return { label: d.toLocaleDateString('es-CO', { weekday: 'short' }), presentes, horas: parseFloat(horas.toFixed(1)) };
    });

    // Payroll last 6 months
    const nomina6 = Array.from({ length: 6 }, (_, i) => {
      let m = now.getMonth() + 1 - (5 - i); let a = now.getFullYear();
      if (m <= 0) { m += 12; a--; }
      const total = nominas.filter((n) => n.mes === m && n.anio === a).reduce((s, n) => s + n.total, 0);
      return { label: MESES_SHORT[m - 1], total };
    });

    // Employee status distribution
    const statusMap: Record<string, number> = {};
    empleados.forEach((e) => { statusMap[e.estado] = (statusMap[e.estado] || 0) + 1; });
    const statusChart = Object.entries(statusMap).map(([s, c]) => ({
      name: s.charAt(0).toUpperCase() + s.slice(1), value: c,
    }));

    // Attendance rate last 30 days
    const last30 = asistencias.filter((a) => {
      const d = new Date(a.fecha + 'T00:00:00');
      return (now.getTime() - d.getTime()) < 30 * 86400000;
    });
    const asistRate = last30.length > 0 ? Math.round(last30.filter((a) => a.estado !== 'ausente').length / last30.length * 100) : 0;

    // Tardiness
    const tardanzas = last30.filter((a) => a.estado === 'tarde').length;
    const ausencias = last30.filter((a) => a.estado === 'ausente').length;

    return { days7, nomina6, statusChart, asistRate, tardanzas, ausencias };
  }, [empleados, asistencias, nominas]);

  if (empleados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
        <h3 className="text-base font-semibold text-slate-700">Sin estadísticas</h3>
        <p className="mt-1 text-sm text-slate-400">Agrega empleados y registra actividad para ver gráficas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick indicators */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-slate-900">{empleados.filter((e) => e.estado === 'activo').length}</p>
          <p className="mt-1 text-xs text-slate-500">Empleados activos</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-emerald-600">{stats.asistRate}%</p>
          <p className="mt-1 text-xs text-slate-500">Tasa de asistencia (30d)</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats.tardanzas}</p>
          <p className="mt-1 text-xs text-slate-500">Tardanzas (30d)</p>
        </Card>
        <Card className="p-5 text-center">
          <p className="text-2xl font-bold text-red-500">{stats.ausencias}</p>
          <p className="mt-1 text-xs text-slate-500">Ausencias (30d)</p>
        </Card>
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Horas trabajadas — últimos 7 días</h3>
          <p className="mb-4 text-xs text-slate-500">Total de horas acumuladas por día</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.days7}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
              <Bar dataKey="horas" name="Horas" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Empleados presentes — últimos 7 días</h3>
          <p className="mb-4 text-xs text-slate-500">Número de empleados que asistieron</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.days7}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
              <Line type="monotone" dataKey="presentes" name="Presentes" stroke="hsl(160 84% 39%)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Costo de nómina — 6 meses</h3>
          <p className="mb-4 text-xs text-slate-500">Total pagado en nómina por mes</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.nomina6}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
              <Bar dataKey="total" name="Nómina" fill="hsl(280 65% 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Distribución por estado</h3>
          <p className="mb-4 text-xs text-slate-500">Estado actual de los empleados</p>
          {stats.statusChart.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={stats.statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={30} paddingAngle={2}>
                    {stats.statusChart.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '13px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {stats.statusChart.map((s, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-sm text-slate-600">{s.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="pt-8 text-center text-sm text-slate-400">Sin datos</p>}
        </Card>
      </div>
    </div>
  );
}
