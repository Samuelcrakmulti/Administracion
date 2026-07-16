'use client';

import { useRef } from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight,
  ArrowDownRight, Printer, Download, Minus,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { printReport } from '@/lib/print-report';

type Finanza = { id: string; tipo: string; categoria: string; descripcion: string; valor: number; fecha: string };
type Venta = { id: string; total: number; fecha: string };

interface Props {
  finanzas: Finanza[];
  ventas: Venta[];
  empresa: string | null;
}

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function semaforo(value: number): 'green' | 'amber' | 'red' {
  if (value > 10) return 'green';
  if (value >= 0) return 'amber';
  return 'red';
}

function getSemaforoLabel(value: number) {
  if (value > 10) return 'Positivo';
  if (value >= 0) return 'Neutral';
  return 'Negativo';
}

export function ReporteFinanciero({ finanzas, ventas, empresa }: Props) {
  const now = new Date();

  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('es-CO', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() };
  });

  const chartData = meses.map(({ label, month, year }) => {
    const ingresos = ventas.filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === month && d.getFullYear() === year; }).reduce((s, v) => s + Number(v.total), 0);
    const gastos = finanzas.filter((f) => { const d = new Date(f.fecha + 'T00:00:00'); return f.tipo === 'Gasto' && d.getMonth() === month && d.getFullYear() === year; }).reduce((s, f) => s + Number(f.valor), 0);
    return { label, ingresos, gastos, utilidad: ingresos - gastos };
  });

  const thisMes = chartData[chartData.length - 1];
  const prevMes = chartData[chartData.length - 2];
  const ingresosMes = thisMes.ingresos;
  const gastosMes = thisMes.gastos;
  const utilidad = thisMes.utilidad;
  const prevIngresos = prevMes?.ingresos ?? 0;
  const cambioIngresos = prevIngresos > 0 ? ((ingresosMes - prevIngresos) / prevIngresos) * 100 : 0;
  const margen = ingresosMes > 0 ? (utilidad / ingresosMes) * 100 : 0;
  const totalIngresos = finanzas.filter((f) => f.tipo === 'Ingreso').reduce((s, f) => s + Number(f.valor), 0) + ventas.reduce((s, v) => s + Number(v.total), 0);
  const totalGastos = finanzas.filter((f) => f.tipo === 'Gasto').reduce((s, f) => s + Number(f.valor), 0);
  const flujo = totalIngresos - totalGastos;
  const sm = semaforo(margen);

  const catGastos = finanzas.filter((f) => f.tipo === 'Gasto').reduce<Record<string, number>>((acc, f) => { acc[f.categoria] = (acc[f.categoria] || 0) + Number(f.valor); return acc; }, {});
  const catGastosArr = Object.entries(catGastos).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const hayDatos = finanzas.length > 0 || ventas.length > 0;

  function handlePDF() {
    const rows = catGastosArr.map(([cat, val]) => `<tr><td>${cat}</td><td>${fmt(val)}</td><td><span class="badge badge-blue">${totalGastos > 0 ? ((val / totalGastos) * 100).toFixed(1) : 0}%</span></td></tr>`).join('');
    const chartRows = chartData.map((d) => `<tr><td>${d.label}</td><td>${fmt(d.ingresos)}</td><td>${fmt(d.gastos)}</td><td class="${d.utilidad >= 0 ? 'badge-green' : 'badge-red'}">${fmt(d.utilidad)}</td></tr>`).join('');
    const semaforoHtml = `<span class="semaforo"><span class="dot dot-${sm === 'green' ? 'green' : sm === 'amber' ? 'amber' : 'red'}"></span>${getSemaforoLabel(margen)} (${margen.toFixed(1)}%)</span>`;
    printReport('Reporte Financiero', empresa, `
<div class="stat-grid">
  <div class="stat-card"><div class="stat-label">Ingresos del mes</div><div class="stat-value">${fmt(ingresosMes)}</div></div>
  <div class="stat-card"><div class="stat-label">Gastos del mes</div><div class="stat-value">${fmt(gastosMes)}</div></div>
  <div class="stat-card"><div class="stat-label">Utilidad neta</div><div class="stat-value">${fmt(utilidad)}</div></div>
  <div class="stat-card"><div class="stat-label">Flujo de caja acumulado</div><div class="stat-value">${fmt(flujo)}</div></div>
</div>
<div class="section"><div class="section-title">Semáforo de desempeño</div>
<p>Margen neto del mes: ${semaforoHtml}</p>
<p>Variación de ingresos vs mes anterior: ${cambioIngresos >= 0 ? '+' : ''}${cambioIngresos.toFixed(1)}%</p>
</div>
<div class="section"><div class="section-title">Evolución financiera (6 meses)</div>
<table><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Utilidad</th></tr></thead><tbody>${chartRows}</tbody></table>
</div>
<div class="section"><div class="section-title">Gastos por categoría</div>
<table><thead><tr><th>Categoría</th><th>Monto</th><th>% del total</th></tr></thead><tbody>${rows}</tbody></table>
</div>`);
  }

  if (!hayDatos) return <EmptyState label="Reporte Financiero" />;

  return (
    <div className="space-y-6">
      <ReporteHeader title="Reporte Financiero" onPrint={handlePDF} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Ingresos del mes" value={fmt(ingresosMes)} sub={`${cambioIngresos >= 0 ? '+' : ''}${cambioIngresos.toFixed(1)}% vs mes anterior`} icon={<DollarSign className="h-5 w-5" />} color="emerald" trend={cambioIngresos >= 0 ? 'up' : 'down'} />
        <KpiCard label="Gastos del mes" value={fmt(gastosMes)} icon={<Wallet className="h-5 w-5" />} color="rose" />
        <KpiCard label="Utilidad neta" value={fmt(utilidad)} icon={utilidad >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} color={utilidad >= 0 ? 'blue' : 'red'} />
        <KpiCard label="Flujo de caja acumulado" value={fmt(flujo)} icon={<Wallet className="h-5 w-5" />} color={flujo >= 0 ? 'teal' : 'red'} />
      </div>

      {/* Semáforos */}
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Semáforos de desempeño</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SemaforoRow label="Margen neto" value={`${margen.toFixed(1)}%`} estado={sm} />
          <SemaforoRow label="Variación de ingresos" value={`${cambioIngresos >= 0 ? '+' : ''}${cambioIngresos.toFixed(1)}%`} estado={semaforo(cambioIngresos)} />
          <SemaforoRow label="Balance general" value={flujo >= 0 ? 'Positivo' : 'Negativo'} estado={flujo >= 0 ? 'green' : 'red'} />
        </div>
      </Card>

      {/* Area chart: evolución 6 meses */}
      <Card className="p-6">
        <h3 className="mb-1 text-sm font-semibold text-slate-900">Evolución financiera — últimos 6 meses</h3>
        <p className="mb-4 text-xs text-slate-500">Ingresos, gastos y utilidad mensual</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(160 84% 39%)" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(160 84% 39%)" stopOpacity={0} /></linearGradient>
              <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(0 70% 55%)" stopOpacity={0.15} /><stop offset="95%" stopColor="hsl(0 70% 55%)" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="hsl(160 84% 39%)" fill="url(#gIngresos)" strokeWidth={2} />
            <Area type="monotone" dataKey="gastos" name="Gastos" stroke="hsl(0 70% 55%)" fill="url(#gGastos)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Gastos por categoría */}
      {catGastosArr.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Gastos por categoría</h3>
          <p className="mb-4 text-xs text-slate-500">Distribución acumulada de gastos</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catGastosArr.map(([name, value]) => ({ name, value }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
              <Bar dataKey="value" name="Gastos" fill="hsl(0 70% 55%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ===== Shared sub-components =====
export function ReporteHeader({ title, onPrint }: { title: string; onPrint: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
          <Printer className="h-3.5 w-3.5" />Imprimir
        </Button>
        <Button size="sm" onClick={onPrint} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />Descargar PDF
        </Button>
      </div>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft">
        <TrendingUp className="h-7 w-7 text-slate-300" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-700">Aún no hay datos para este reporte</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-400">
        Registra {label === 'Reporte Financiero' ? 'ingresos y gastos' : label === 'Reporte de Ventas' ? 'ventas' : label === 'Reporte de Inventario' ? 'productos' : 'transacciones'} en la plataforma para generar el {label}.
      </p>
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color, trend }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string; trend?: 'up' | 'down' }) {
  const colorMap: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-600', rose: 'bg-rose-50 text-rose-600', blue: 'bg-blue-50 text-blue-600', teal: 'bg-teal-50 text-teal-600', red: 'bg-red-50 text-red-600' };
  return (
    <Card className="p-5">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', colorMap[color] || 'bg-slate-50 text-slate-600')}>{icon}</div>
      <p className="mt-4 text-xl font-bold text-slate-900">{value}</p>
      {sub && (
        <div className="mt-1 flex items-center gap-1">
          {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
          {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
          <span className="text-xs text-slate-500">{sub}</span>
        </div>
      )}
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}

function SemaforoRow({ label, value, estado }: { label: string; value: string; estado: 'green' | 'amber' | 'red' }) {
  const dotColor = { green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }[estado];
  const textColor = { green: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' }[estado];
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-bold', textColor)}>{value}</span>
        <span className={cn('h-2.5 w-2.5 rounded-full', dotColor)} />
      </div>
    </div>
  );
}
