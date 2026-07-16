'use client';

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Package, PackageX, AlertTriangle, DollarSign, Boxes, Tag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { printReport } from '@/lib/print-report';
import { ReporteHeader, EmptyState } from './reporte-financiero';
import { cn } from '@/lib/utils';

type Producto = { id: string; nombre: string; codigo: string; categoria: string; precio_compra: number; precio_venta: number; cantidad: number; stock_minimo: number; proveedor: string };
type Detalle = { id: string; producto_id: string; cantidad: number };

interface Props {
  productos: Producto[];
  detalles: Detalle[];
  empresa: string | null;
}

const PIE_COLORS = ['hsl(221 83% 53%)', 'hsl(160 84% 39%)', 'hsl(30 80% 55%)', 'hsl(280 65% 60%)', 'hsl(340 75% 55%)', 'hsl(190 85% 40%)'];

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

export function ReporteInventario({ productos, detalles, empresa }: Props) {
  const agotados = productos.filter((p) => p.cantidad <= 0);
  const stockBajo = productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo);
  const stockOk = productos.filter((p) => p.cantidad > p.stock_minimo);
  const valorTotal = productos.reduce((s, p) => s + Number(p.precio_venta) * p.cantidad, 0);
  const unidades = productos.reduce((s, p) => s + p.cantidad, 0);

  // Rotation
  const rotacion: Record<string, number> = {};
  detalles.forEach((d) => { rotacion[d.producto_id] = (rotacion[d.producto_id] || 0) + d.cantidad; });
  const porRotacion = productos
    .map((p) => ({ nombre: p.nombre, vendidas: rotacion[p.id] || 0, stock: p.cantidad }))
    .sort((a, b) => b.vendidas - a.vendidas);
  const masRotacion = porRotacion.slice(0, 5);
  const menosRotacion = [...porRotacion].sort((a, b) => a.vendidas - b.vendidas).slice(0, 5);

  // Categories
  const catMap: Record<string, number> = {};
  productos.forEach((p) => { catMap[p.categoria] = (catMap[p.categoria] || 0) + 1; });
  const catArr = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  // Stock bar chart (lowest 7)
  const stockChart = [...productos].filter((p) => p.cantidad > 0).sort((a, b) => a.cantidad - b.cantidad).slice(0, 7).map((p) => ({ name: p.nombre, stock: p.cantidad, minimo: p.stock_minimo }));

  const hayDatos = productos.length > 0;

  function handlePDF() {
    const agotRows = agotados.map((p) => `<tr><td>${p.nombre}</td><td>${p.codigo}</td><td><span class="badge badge-red">Agotado</span></td></tr>`).join('');
    const bajoRows = stockBajo.map((p) => `<tr><td>${p.nombre}</td><td>${p.cantidad}</td><td>${p.stock_minimo}</td><td><span class="badge badge-amber">Stock bajo</span></td></tr>`).join('');
    const rotRows = masRotacion.map((p) => `<tr><td>${p.nombre}</td><td>${p.vendidas}</td><td>${p.stock}</td></tr>`).join('');
    printReport('Reporte de Inventario', empresa, `
<div class="stat-grid">
  <div class="stat-card"><div class="stat-label">Productos registrados</div><div class="stat-value">${productos.length}</div></div>
  <div class="stat-card"><div class="stat-label">Unidades disponibles</div><div class="stat-value">${unidades.toLocaleString('es-CO')}</div></div>
  <div class="stat-card"><div class="stat-label">Valor del inventario</div><div class="stat-value">${fmt(valorTotal)}</div></div>
  <div class="stat-card"><div class="stat-label">Alertas activas</div><div class="stat-value">${agotados.length + stockBajo.length}</div></div>
</div>
${agotados.length > 0 ? `<div class="section"><div class="section-title">Productos agotados</div><table><thead><tr><th>Producto</th><th>Código</th><th>Estado</th></tr></thead><tbody>${agotRows}</tbody></table></div>` : ''}
${stockBajo.length > 0 ? `<div class="section"><div class="section-title">Stock bajo</div><table><thead><tr><th>Producto</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th></tr></thead><tbody>${bajoRows}</tbody></table></div>` : ''}
<div class="section"><div class="section-title">Mayor rotación</div><table><thead><tr><th>Producto</th><th>Unidades vendidas</th><th>Stock actual</th></tr></thead><tbody>${rotRows}</tbody></table></div>`);
  }

  if (!hayDatos) return <EmptyState label="Reporte de Inventario" />;

  return (
    <div className="space-y-6">
      <ReporteHeader title="Reporte de Inventario" onPrint={handlePDF} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <InvCard label="Productos registrados" value={String(productos.length)} icon={<Package className="h-5 w-5" />} color="blue" />
        <InvCard label="Unidades disponibles" value={unidades.toLocaleString('es-CO')} icon={<Boxes className="h-5 w-5" />} color="emerald" />
        <InvCard label="Valor del inventario" value={fmt(valorTotal)} icon={<DollarSign className="h-5 w-5" />} color="violet" />
        <InvCard label="Alertas activas" value={String(agotados.length + stockBajo.length)} icon={<AlertTriangle className="h-5 w-5" />} color={agotados.length + stockBajo.length > 0 ? 'amber' : 'green'} />
      </div>

      {/* Estado del stock */}
      <Card className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Estado general del stock</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center rounded-xl bg-emerald-50 p-4">
            <span className="text-2xl font-bold text-emerald-600">{stockOk.length}</span>
            <span className="mt-1 text-xs text-emerald-700">Stock suficiente</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-amber-50 p-4">
            <span className="text-2xl font-bold text-amber-600">{stockBajo.length}</span>
            <span className="mt-1 text-xs text-amber-700">Stock bajo</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-red-50 p-4">
            <span className="text-2xl font-bold text-red-600">{agotados.length}</span>
            <span className="mt-1 text-xs text-red-700">Agotados</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Stock más bajo */}
        {stockChart.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Productos con menor stock</h3>
            <p className="mb-4 text-xs text-slate-500">Stock actual vs mínimo requerido</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stockChart} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="stock" name="Stock actual" fill="hsl(30 80% 55%)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="minimo" name="Stock mínimo" fill="hsl(214 32% 80%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Distribución por categoría */}
        {catArr.length > 0 && (
          <Card className="p-6">
            <h3 className="mb-1 text-sm font-semibold text-slate-900">Distribución por categoría</h3>
            <p className="mb-4 text-xs text-slate-500">Cantidad de productos por categoría</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={catArr} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={35} paddingAngle={2}>
                  {catArr.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="white" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Rotación */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Tag className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-900">Mayor rotación</h3>
          </div>
          <div className="space-y-2">
            {masRotacion.length > 0 ? masRotacion.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{p.nombre}</span>
                <span className="font-semibold text-emerald-600">{p.vendidas} uds</span>
              </div>
            )) : <p className="text-xs text-slate-400">Sin datos de ventas</p>}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <PackageX className="h-4 w-4 text-rose-600" />
            <h3 className="text-sm font-semibold text-slate-900">Menor rotación</h3>
          </div>
          <div className="space-y-2">
            {menosRotacion.length > 0 ? menosRotacion.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{p.nombre}</span>
                <span className="font-semibold text-rose-600">{p.vendidas} uds</span>
              </div>
            )) : <p className="text-xs text-slate-400">Sin datos</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function InvCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const cm: Record<string, string> = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600', green: 'bg-emerald-50 text-emerald-600' };
  return (
    <Card className="p-5">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cm[color] || 'bg-slate-50 text-slate-600')}>{icon}</div>
      <p className="mt-4 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}
