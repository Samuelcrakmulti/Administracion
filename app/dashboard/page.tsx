'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag,
  Package,
  AlertTriangle,
  Boxes,
  ArrowRight,
  ShoppingCart,
  Crown,
  CreditCard,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

type Producto = {
  id: string;
  nombre: string;
  cantidad: number;
  stock_minimo: number;
  precio_venta: number;
};

type Venta = {
  id: string;
  cliente: string;
  total: number;
  metodo_pago: string;
  fecha: string;
  created_at: string;
};

type Detalle = {
  producto_id: string;
  cantidad: number;
};

type Movimiento = {
  tipo: string;
  valor: number;
  fecha: string;
};

const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const colorMap: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
};

export default function DashboardHome() {
  const { empresa, user } = useAuth();
  const greetingName = empresa?.nombre || user?.email?.split('@')[0] || 'usuario';

  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const fetchData = useCallback(async () => {
    const [invRes, venRes, detRes, finRes] = await Promise.all([
      supabase.from('inventario').select('id, nombre, cantidad, stock_minimo, precio_venta'),
      supabase.from('ventas').select('*').order('created_at', { ascending: false }),
      supabase.from('detalle_venta').select('producto_id, cantidad'),
      supabase.from('finanzas').select('tipo, valor, fecha'),
    ]);

    if (invRes.data) setProductos(invRes.data as Producto[]);
    if (venRes.data) setVentas(venRes.data as Venta[]);
    if (detRes.data) setDetalles(detRes.data as Detalle[]);
    if (finRes.data) setMovimientos(finRes.data as Movimiento[]);
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Inventory stats
  const totalProductos = productos.length;
  const stockBajo = productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo);
  const agotados = productos.filter((p) => p.cantidad <= 0);
  const valorInventario = productos.reduce((s, p) => s + Number(p.precio_venta) * p.cantidad, 0);
  const alertasInventario = [...agotados, ...stockBajo];

  // Sales stats
  const now = new Date();
  const ventasMes = ventas.filter((v) => {
    const d = new Date(v.fecha + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const ingresoMes = ventasMes.reduce((s, v) => s + Number(v.total), 0);
  const ultimaVenta = ventas[0] || null;

  // Top product
  const topProducto = useMemo(() => {
    const prodCount = new Map<string, number>();
    detalles.forEach((d) => {
      prodCount.set(d.producto_id, (prodCount.get(d.producto_id) || 0) + d.cantidad);
    });
    let topId: string | null = null;
    let topCount = 0;
    prodCount.forEach((count, pid) => {
      if (count > topCount) {
        topCount = count;
        topId = pid;
      }
    });
    if (!topId) return null;
    return productos.find((p) => p.id === topId)?.nombre || null;
  }, [detalles, productos]);

  // Chart data from real finanzas
  const chartData = useMemo(() => {
    const byMonth: Record<string, { ventas: number; gastos: number }> = {};
    movimientos.forEach((m) => {
      const d = new Date(m.fecha + 'T00:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!byMonth[key]) byMonth[key] = { ventas: 0, gastos: 0 };
      if (m.tipo === 'Ingreso') byMonth[key].ventas += Number(m.valor);
      else byMonth[key].gastos += Number(m.valor);
    });
    return Object.entries(byMonth)
      .sort((a, b) => {
        const [ay, am] = a[0].split('-').map(Number);
        const [by, bm] = b[0].split('-').map(Number);
        return ay !== by ? ay - by : am - bm;
      })
      .map(([key, val]) => {
        const [, mes] = key.split('-').map(Number);
        return { month: mesesNombres[mes], ventas: val.ventas, gastos: val.gastos };
      });
  }, [movimientos]);

  // Recent sales as activity
  const recentVentas = useMemo(() => ventas.slice(0, 4), [ventas]);

  const formatCurrency = (v: number) =>
    v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const today = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  const statCards = [
    { label: 'Ventas del mes', value: formatCurrency(ingresoMes), sub: `${ventasMes.length} ventas`, icon: ShoppingCart, color: 'blue' },
    { label: 'Ingresos', value: formatCurrency(movimientos.filter((m) => m.tipo === 'Ingreso').reduce((s, m) => s + Number(m.valor), 0)), sub: 'Total', icon: DollarSign, color: 'emerald' },
    { label: 'Gastos', value: formatCurrency(movimientos.filter((m) => m.tipo === 'Gasto').reduce((s, m) => s + Number(m.valor), 0)), sub: 'Total', icon: Wallet, color: 'amber' },
    { label: 'Productos', value: String(totalProductos), sub: `${alertasInventario.length} stock bajo`, icon: Package, color: 'violet' },
  ];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Bienvenida, {greetingName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Este es el resumen de tu negocio hoy, {today}.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5 transition-shadow hover:shadow-soft-lg">
            <div className="flex items-center justify-between">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', colorMap[s.color])}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{s.value}</p>
            <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            <p className="mt-0.5 text-xs text-slate-400">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Inventory stats + alerts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-2">
          <Card className="p-5 transition-shadow hover:shadow-soft-lg">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Package className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{totalProductos}</p>
            <p className="mt-1 text-sm text-slate-500">Total de productos</p>
          </Card>
          <Card className="p-5 transition-shadow hover:shadow-soft-lg">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Boxes className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{formatCurrency(valorInventario)}</p>
            <p className="mt-1 text-sm text-slate-500">Valor del inventario</p>
          </Card>
          <Card className="p-5 transition-shadow hover:shadow-soft-lg">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', alertasInventario.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{alertasInventario.length}</p>
            <p className="mt-1 text-sm text-slate-500">Productos con stock bajo</p>
          </Card>
        </div>

        {/* Low stock alerts */}
        <Card className={cn('p-6', alertasInventario.length > 0 ? 'border-amber-200/60 bg-amber-50/30' : '')}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn('h-5 w-5', alertasInventario.length > 0 ? 'text-amber-600' : 'text-emerald-500')} />
            <h2 className="text-base font-semibold text-slate-900">Alertas de inventario</h2>
          </div>
          {alertasInventario.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <Package className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-700">Todo en orden</p>
              <p className="mt-1 text-xs text-slate-500">No hay productos que necesiten reposición.</p>
            </div>
          ) : (
            <>
              <p className="mt-1 text-xs text-slate-500">{alertasInventario.length} producto(s) necesitan reposición</p>
              <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
                {alertasInventario.map((p) => {
                  const agotado = p.cantidad <= 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3 rounded-xl border border-amber-200/70 bg-white p-3">
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', agotado ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600')}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{p.nombre}</p>
                        <p className="text-xs text-slate-500">Stock: {p.cantidad} · Mínimo: {p.stock_minimo}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href="/dashboard/inventario" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                Ver inventario completo <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          )}
        </Card>
      </div>

      {/* Sales highlights */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Producto más vendido</p>
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900">{topProducto || '—'}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Última venta</p>
          </div>
          {ultimaVenta ? (
            <div className="mt-3">
              <p className="text-lg font-bold text-slate-900">{ultimaVenta.cliente}</p>
              <p className="text-sm text-slate-500">{formatCurrency(Number(ultimaVenta.total))} · {formatDate(ultimaVenta.fecha)}</p>
            </div>
          ) : (
            <p className="mt-3 text-lg font-bold text-slate-400">—</p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-violet-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ventas del mes</p>
          </div>
          <p className="mt-3 text-lg font-bold text-slate-900">{formatCurrency(ingresoMes)}</p>
          <p className="text-sm text-slate-500">{ventasMes.length} ventas registradas</p>
        </Card>
      </div>

      {/* Chart + Recent sales */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Finance chart */}
        <Card className="lg:col-span-2">
          <div className="border-b border-slate-100 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Resumen financiero</h2>
                <p className="mt-1 text-sm text-slate-500">Ingresos vs. gastos durante el año</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Ingresos
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Gastos
                </span>
              </div>
            </div>
          </div>
          <div className="p-4">
            {chartData.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                Sin datos suficientes para mostrar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(30 80% 55%)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(30 80% 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(215 16% 47%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(214 32% 91%)', fontSize: '13px' }} />
                  <Area type="monotone" dataKey="ventas" stroke="hsl(221 83% 53%)" strokeWidth={2.5} fill="url(#colorVentas)" />
                  <Area type="monotone" dataKey="gastos" stroke="hsl(30 80% 55%)" strokeWidth={2.5} fill="url(#colorGastos)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Recent sales */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Ventas recientes</h2>
              <p className="mt-1 text-sm text-slate-500">Últimas ventas registradas</p>
            </div>
            <Link href="/dashboard/ventas" className="text-xs font-semibold text-primary hover:underline">
              Ver todas
            </Link>
          </div>
          {recentVentas.length === 0 ? (
            <div className="mt-5 flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <ShoppingBag className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm text-slate-500">No hay ventas registradas</p>
            </div>
          ) : (
            <div className="mt-5 space-y-1">
              {recentVentas.map((v) => (
                <div key={v.id} className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{v.cliente}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {formatCurrency(Number(v.total))} · {v.metodo_pago}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{formatDate(v.fecha)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
