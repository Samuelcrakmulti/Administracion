'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { ShoppingCart, TrendingUp, Receipt, Users, Star, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { printReport } from '@/lib/print-report';
import { ReporteHeader, EmptyState } from './reporte-financiero';
import { cn } from '@/lib/utils';

type Venta = { id: string; cliente: string; total: number; metodo_pago: string; estado: string; fecha: string };
type Detalle = { id: string; venta_id: string; producto_id: string; cantidad: number; precio_unitario: number; subtotal: number };
type Producto = { id: string; nombre: string };

interface Props {
  ventas: Venta[];
  detalles: Detalle[];
  productos: Producto[];
  empresa: string | null;
}

const PIE_COLORS = ['hsl(221 83% 53%)', 'hsl(160 84% 39%)', 'hsl(30 80% 55%)', 'hsl(280 65% 60%)', 'hsl(340 75% 55%)'];

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

export function ReporteVentas({ ventas, detalles, productos, empresa }: Props) {
  const now = new Date();

  // Monthly data (6 months)
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('es-CO', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() };
  });
  const chartMensual = meses.map(({ label, month, year }) => {
    const mv = ventas.filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === month && d.getFullYear() === year; });
    return { label, total: mv.reduce((s, v) => s + Number(v.total), 0), cantidad: mv.length };
  });

  const ventasMes = ventas.filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const ingresosMes = ventasMes.reduce((s, v) => s + Number(v.total), 0);
  const ticketPromedio = ventasMes.length > 0 ? ingresosMes / ventasMes.length : 0;

  // Payment methods
  const pagos: Record<string, number> = {};
  ventas.forEach((v) => { pagos[v.metodo_pago] = (pagos[v.metodo_pago] || 0) + Number(v.total); });
  const pagoArr = Object.entries(pagos).map(([name, value]) => ({ name, value }));

  // Product rotation
  const prodVentas: Record<string, number> = {};
  detalles.forEach((d) => { prodVentas[d.producto_id] = (prodVentas[d.producto_id] || 0) + d.cantidad; });
  const prodArr = Object.entries(prodVentas)
    .map(([id, qty]) => ({ nombre: productos.find((p) => p.id === id)?.nombre ?? id, qty }))
    .sort((a, b) => b.qty - a.qty);
  const masMasVendido = prodArr[0];
  const menosVendido = prodArr[prodArr.length - 1];

  // Daily chart (current month)
  const diasDelMes: Record<string, number> = {};
  ventasMes.forEach((v) => { const d = new Date(v.fecha + 'T00:00:00').getDate(); diasDelMes[d] = (diasDelMes[d] || 0) + Number(v.total); });
  const chartDiario = Object.entries(diasDelMes).sort((a, b) => +a[0] - +b[0]).map(([d, total]) => ({ label: `D${d}`, total }));

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevVentas = ventas.filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear(); });
  const prevIngr = prevVentas.reduce((s, v) => s + Number(v.total), 0);
  const cambio = prevIngr > 0 ? ((ingresosMes - prevIngr) / prevIngr) * 100 : 0;

  const hayDatos = ventas.length > 0;

  function handlePDF() {
    const chartRows = chartMensual.map((d) => `<tr><td>${d.label}</td><td>${d.cantidad}</td><td>${fmt(d.total)}</td></tr>`).join('');
    const pagoRows = pagoArr.map((p) => `<tr><td>${p.name}</td><td>${fmt(p.value)}</td><td><span class="badge badge-blue">${(p.value / (ventas.reduce((s, v) => s + Number(v.total), 0) || 1) * 100).toFixed(1)}%</span></td></tr>`).join('');
    printReport('Reporte de Ventas', empresa, `
<div class="stat-grid">
  <div class="stat-card"><div class="stat-label">Ventas del mes</div><div class="stat-value">${ventasMes.length}</div></div>
  <div class="stat-card"><div class="stat-label">Ingresos del mes</div><div class="stat-value">${fmt(ingresosMes)}</div></div>
  <div class="stat-card"><div class="stat-label">Ticket promedio</div><div class="stat-value">${fmt(ticketPromedio)}</div></div>
  <div class="stat-card"><div class="stat-label">Variación vs mes anterior</div><div class="stat-value">${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)}%</div></div>
</div>
<div class="section"><div class="section-title">Evolución mensual de ventas</div>
<table><thead><tr><th>Mes</th><th>N° Ventas</th><th>Total</th></tr></thead><tbody>${chartRows}</tbody></table>
</div>
<div class="section"><div class="section-title">Métodos de pago</div>
<table><thead><tr><th>Método</th><th>Monto</th><th>% del total</th></tr></thead><tbody>${pagoRows}</tbody></table>
</div>
<div class="section"><div class="section-title">Producto más vendido</div>
<p>${masMasVendido ? `${masMasVendido.nombre} — ${masMasVendido.qty} unidades` : 'Sin datos'}</p>
</div>`);
  }

  if (!hayDatos) return <EmptyState label="Reporte de Ventas" />;

  return (
    <div className="space-y-6">
      <ReporteHeader title="Reporte de Ventas" onPrint={handlePDF} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KVCard label="Ventas del mes" value={String(ventasMes.length)} icon={<ShoppingCart className="h-5 w-5" />} color="blue" />
        <KVCard label="Ingresos del mes" value={fmt(ingresosMes)} icon={<TrendingUp className="h-5 w-5" />} color="emerald" />
        <KVCard label="Ticket promedio" value={fmt(ticketPromedio)} icon={<Receipt className="h-5 w-5" />} color="amber" />
        <KVCard label="Variación vs mes ant." value={`${cambio >= 0 ? '+' : ''}${cambio.toFixed(1)}%`} icon={cambio >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />} color={cambio >= 0 ? 'teal' : 'rose'} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Evolución mensual de ventas</h3>
          <p className="mb-4 text-xs text-slate-500">Total de ingresos por mes (últimos 6 meses)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
              <Line type="monotone" dataKey="total" name="Ingresos" stroke="hsl(221 83% 53%)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Métodos de pago</h3>
          <p className="mb-4 text-xs text-slate-500">Distribución por forma de pago</p>
          {pagoArr.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pagoArr} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                  {pagoArr.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="pt-10 text-center text-sm text-slate-400">Sin datos</p>}
        </Card>
      </div>

      {chartDiario.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">Ventas por día — mes actual</h3>
          <p className="mb-4 text-xs text-slate-500">Ingresos diarios del mes en curso</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartDiario}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
              <Bar dataKey="total" name="Ventas" fill="hsl(221 83% 53%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {masMasVendido && (
          <Card className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50"><Star className="h-6 w-6 text-emerald-600" /></div>
            <div><p className="text-xs text-slate-500">Producto más vendido</p><p className="text-base font-bold text-slate-900">{masMasVendido.nombre}</p><p className="text-xs text-slate-400">{masMasVendido.qty} unidades</p></div>
          </Card>
        )}
        {menosVendido && menosVendido !== masMasVendido && (
          <Card className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50"><CreditCard className="h-6 w-6 text-rose-600" /></div>
            <div><p className="text-xs text-slate-500">Producto menos vendido</p><p className="text-base font-bold text-slate-900">{menosVendido.nombre}</p><p className="text-xs text-slate-400">{menosVendido.qty} unidades</p></div>
          </Card>
        )}
      </div>
    </div>
  );
}

function KVCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const cm: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', teal: 'bg-teal-50 text-teal-600', rose: 'bg-rose-50 text-rose-600' };
  return (
    <Card className="p-5">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cm[color] || 'bg-slate-50 text-slate-600')}>{icon}</div>
      <p className="mt-4 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}
