'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, UserCheck, UserX, Star, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { printReport } from '@/lib/print-report';
import { ReporteHeader, EmptyState } from './reporte-financiero';
import { cn } from '@/lib/utils';

type Venta = { id: string; cliente: string; total: number; metodo_pago: string; estado: string; fecha: string };

interface Props {
  ventas: Venta[];
  empresa: string | null;
}

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

export function ReporteClientes({ ventas, empresa }: Props) {
  const now = new Date();

  // Build client stats
  const clientMap: Record<string, { total: number; count: number; lastDate: string }> = {};
  ventas.forEach((v) => {
    if (!clientMap[v.cliente]) clientMap[v.cliente] = { total: 0, count: 0, lastDate: v.fecha };
    clientMap[v.cliente].total += Number(v.total);
    clientMap[v.cliente].count += 1;
    if (v.fecha > clientMap[v.cliente].lastDate) clientMap[v.cliente].lastDate = v.fecha;
  });

  const clientArr = Object.entries(clientMap).map(([nombre, stats]) => ({ nombre, ...stats, promedio: stats.total / stats.count })).sort((a, b) => b.total - a.total);

  const totalClientes = clientArr.length;
  const valorPromedioPorCliente = totalClientes > 0 ? clientArr.reduce((s, c) => s + c.total, 0) / totalClientes : 0;
  const ticketGlobal = ventas.length > 0 ? ventas.reduce((s, v) => s + Number(v.total), 0) / ventas.length : 0;

  // New clients (first purchase this month)
  const firstPurchase: Record<string, string> = {};
  [...ventas].sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach((v) => {
    if (!firstPurchase[v.cliente]) firstPurchase[v.cliente] = v.fecha;
  });
  const clientesNuevosMes = Object.entries(firstPurchase).filter(([, fecha]) => {
    const d = new Date(fecha + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Frequent clients (3+ purchases)
  const frecuentes = clientArr.filter((c) => c.count >= 3);

  // Inactive (no purchase in 60+ days)
  const cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const inactivos = clientArr.filter((c) => c.lastDate < cutoff);

  // Top 5 clients by revenue
  const top5 = clientArr.slice(0, 5);

  // Frequency histogram
  const freqBuckets: Record<string, number> = { '1': 0, '2': 0, '3-5': 0, '6-10': 0, '10+': 0 };
  clientArr.forEach((c) => {
    if (c.count === 1) freqBuckets['1']++;
    else if (c.count === 2) freqBuckets['2']++;
    else if (c.count <= 5) freqBuckets['3-5']++;
    else if (c.count <= 10) freqBuckets['6-10']++;
    else freqBuckets['10+']++;
  });
  const freqChart = Object.entries(freqBuckets).map(([label, value]) => ({ label, value }));

  const hayDatos = ventas.length > 0;

  function handlePDF() {
    const topRows = top5.map((c) => `<tr><td>${c.nombre}</td><td>${c.count}</td><td>${fmt(c.total)}</td><td>${fmt(c.promedio)}</td></tr>`).join('');
    printReport('Reporte de Clientes', empresa, `
<div class="stat-grid">
  <div class="stat-card"><div class="stat-label">Clientes registrados</div><div class="stat-value">${totalClientes}</div></div>
  <div class="stat-card"><div class="stat-label">Clientes nuevos este mes</div><div class="stat-value">${clientesNuevosMes}</div></div>
  <div class="stat-card"><div class="stat-label">Clientes frecuentes</div><div class="stat-value">${frecuentes.length}</div></div>
  <div class="stat-card"><div class="stat-label">Ticket promedio</div><div class="stat-value">${fmt(ticketGlobal)}</div></div>
</div>
<div class="section"><div class="section-title">Top 5 clientes por ingresos</div>
<table><thead><tr><th>Cliente</th><th>Compras</th><th>Total</th><th>Promedio</th></tr></thead><tbody>${topRows}</tbody></table>
</div>
<div class="section"><div class="section-title">Análisis de clientes</div>
<p>Clientes inactivos (+60 días): ${inactivos.length}</p>
<p>Valor promedio por cliente: ${fmt(valorPromedioPorCliente)}</p>
</div>`);
  }

  if (!hayDatos) return <EmptyState label="Reporte de Clientes" />;

  return (
    <div className="space-y-6">
      <ReporteHeader title="Reporte de Clientes" onPrint={handlePDF} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ClCard label="Clientes registrados" value={String(totalClientes)} icon={<Users className="h-5 w-5" />} color="blue" />
        <ClCard label="Nuevos este mes" value={String(clientesNuevosMes)} icon={<UserCheck className="h-5 w-5" />} color="emerald" />
        <ClCard label="Clientes frecuentes" value={String(frecuentes.length)} icon={<Star className="h-5 w-5" />} color="amber" />
        <ClCard label="Ticket promedio" value={fmt(ticketGlobal)} icon={<TrendingUp className="h-5 w-5" />} color="teal" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 5 by revenue */}
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Top clientes por ingresos</h3>
          <p className="mb-4 text-xs text-slate-500">Los 5 clientes que más han generado</p>
          {top5.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top5.map((c) => ({ name: c.nombre.split(' ')[0], total: c.total }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                <Bar dataKey="total" name="Ingresos" fill="hsl(221 83% 53%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="pt-10 text-center text-sm text-slate-400">Sin datos</p>}
        </Card>

        {/* Frequency histogram */}
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Frecuencia de compra</h3>
          <p className="mb-4 text-xs text-slate-500">Distribución de clientes por número de compras</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={freqChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
              <Bar dataKey="value" name="Clientes" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Client list */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Detalle de clientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Cliente', 'N° Compras', 'Total', 'Promedio', 'Última compra', 'Estado'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientArr.slice(0, 10).map((c, i) => {
                const isInactivo = c.lastDate < cutoff;
                const isFrecuente = c.count >= 3;
                return (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{c.nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.count}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmt(c.total)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{fmt(c.promedio)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.lastDate + 'T00:00:00').toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', isInactivo ? 'bg-rose-50 text-rose-600' : isFrecuente ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600')}>
                        {isInactivo ? 'Inactivo' : isFrecuente ? 'Frecuente' : 'Activo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {inactivos.length > 0 && (
        <Card className="flex items-center gap-4 border-rose-200/60 bg-rose-50/40 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600"><UserX className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{inactivos.length} cliente{inactivos.length !== 1 ? 's' : ''} inactivo{inactivos.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-slate-500">Sin compras en los últimos 60 días. Considera campañas de reactivación.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function ClCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const cm: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', teal: 'bg-teal-50 text-teal-600' };
  return (
    <Card className="p-5">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cm[color] || 'bg-slate-50 text-slate-600')}>{icon}</div>
      <p className="mt-4 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}
