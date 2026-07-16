'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BarChart2, DollarSign, ShoppingCart, Package, Users, Brain,
  ChevronRight, Loader2, Clock, Database,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { ReporteFinanciero } from '@/components/dashboard/reportes/reporte-financiero';
import { ReporteVentas } from '@/components/dashboard/reportes/reporte-ventas';
import { ReporteInventario } from '@/components/dashboard/reportes/reporte-inventario';
import { ReporteClientes } from '@/components/dashboard/reportes/reporte-clientes';
import { ReporteEjecutivo } from '@/components/dashboard/reportes/reporte-ejecutivo';

type Venta = { id: string; cliente: string; total: number; metodo_pago: string; estado: string; fecha: string; created_at: string };
type Finanza = { id: string; tipo: string; categoria: string; descripcion: string; valor: number; fecha: string };
type Producto = { id: string; nombre: string; codigo: string; categoria: string; precio_compra: number; precio_venta: number; cantidad: number; stock_minimo: number; proveedor: string; created_at: string };
type Detalle = { id: string; venta_id: string; producto_id: string; cantidad: number; precio_unitario: number; subtotal: number };

type ReporteKey = 'financiero' | 'ventas' | 'inventario' | 'clientes' | 'ejecutivo';

const reporteCards: {
  key: ReporteKey;
  title: string;
  description: string;
  icon: typeof BarChart2;
  gradient: string;
  iconBg: string;
  badge?: string;
}[] = [
  { key: 'financiero', title: 'Reporte Financiero', description: 'Ingresos, gastos, utilidad, flujo de caja y balance con comparación mensual.', icon: DollarSign, gradient: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-50 text-emerald-600' },
  { key: 'ventas', title: 'Reporte de Ventas', description: 'Ventas por período, productos más vendidos, métodos de pago y ticket promedio.', icon: ShoppingCart, gradient: 'from-blue-500 to-blue-700', iconBg: 'bg-blue-50 text-blue-600' },
  { key: 'inventario', title: 'Reporte de Inventario', description: 'Stock disponible, alertas, rotación de productos y valor del inventario.', icon: Package, gradient: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-50 text-amber-600' },
  { key: 'clientes', title: 'Reporte de Clientes', description: 'Análisis de clientes, frecuencia de compra, top clientes e inactivos.', icon: Users, gradient: 'from-violet-500 to-purple-700', iconBg: 'bg-violet-50 text-violet-600' },
  { key: 'ejecutivo', title: 'Reporte Ejecutivo IA', description: 'Informe empresarial completo generado por Gemini con análisis FODA, recomendaciones y plan de acción.', icon: Brain, gradient: 'from-primary to-blue-700', iconBg: 'bg-primary/10 text-primary', badge: 'IA' },
];

export default function ReportesPage() {
  const { user, empresa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [finanzas, setFinanzas] = useState<Finanza[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [active, setActive] = useState<ReporteKey | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [v, f, p, d] = await Promise.all([
      supabase.from('ventas').select('*').order('fecha', { ascending: false }),
      supabase.from('finanzas').select('*').order('fecha', { ascending: false }),
      supabase.from('inventario').select('*').order('created_at', { ascending: false }),
      supabase.from('detalle_venta').select('*'),
    ]);
    setVentas((v.data as Venta[]) || []);
    setFinanzas((f.data as Finanza[]) || []);
    setProductos((p.data as Producto[]) || []);
    setDetalles((d.data as Detalle[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleSelect = (key: ReporteKey) => {
    setActive(key);
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const today = new Date().toLocaleDateString('es-CO', { dateStyle: 'long' });

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reportes Inteligentes</h1>
            <p className="text-sm text-slate-500">Análisis profesional de tu negocio con IA integrada</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-500">{today}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* 5 Report cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reporteCards.map((r) => (
              <Card
                key={r.key}
                className={cn('group relative overflow-hidden p-6 transition-all hover:shadow-soft-lg', active === r.key && 'ring-2 ring-primary/20')}
              >
                {/* Gradient accent bar */}
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', r.gradient)} />

                <div className="flex items-start justify-between">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', r.iconBg)}>
                    <r.icon className="h-5 w-5" />
                  </div>
                  {r.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      <Brain className="h-3 w-3" />{r.badge}
                    </span>
                  )}
                </div>

                <h3 className="mt-4 text-base font-bold text-slate-900">{r.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{r.description}</p>

                {/* Data counters */}
                <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Database className="h-3 w-3" />
                    {r.key === 'financiero' ? `${finanzas.length} transacciones` :
                     r.key === 'ventas' ? `${ventas.length} ventas` :
                     r.key === 'inventario' ? `${productos.length} productos` :
                     r.key === 'clientes' ? `${new Set(ventas.map((v) => v.cliente)).size} clientes` :
                     `${ventas.length + productos.length + finanzas.length} registros`}
                  </span>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={active === r.key ? 'default' : 'outline'}
                    className="flex-1 gap-1.5"
                    onClick={() => handleSelect(r.key)}
                  >
                    {active === r.key ? 'Reporte abierto' : 'Ver reporte'}
                    <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Report viewer */}
          {active && (
            <div ref={reportRef} className="mt-8 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
              <div className="mb-6 flex items-center gap-3 border-b border-slate-100 pb-5">
                {(() => { const card = reporteCards.find((c) => c.key === active)!; return (<><div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', card.iconBg)}><card.icon className="h-4 w-4" /></div><div><p className="text-base font-bold text-slate-900">{card.title}</p><p className="text-xs text-slate-400">{today}</p></div></>); })()}
              </div>

              {active === 'financiero' && <ReporteFinanciero finanzas={finanzas} ventas={ventas} empresa={empresa?.nombre ?? null} />}
              {active === 'ventas' && <ReporteVentas ventas={ventas} detalles={detalles} productos={productos} empresa={empresa?.nombre ?? null} />}
              {active === 'inventario' && <ReporteInventario productos={productos} detalles={detalles} empresa={empresa?.nombre ?? null} />}
              {active === 'clientes' && <ReporteClientes ventas={ventas} empresa={empresa?.nombre ?? null} />}
              {active === 'ejecutivo' && <ReporteEjecutivo ventas={ventas} finanzas={finanzas} productos={productos} detalles={detalles} empresa={empresa?.nombre ?? null} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
