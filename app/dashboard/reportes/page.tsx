'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  BarChart2, DollarSign, ShoppingCart, Package, Users, Brain, Fuel,
  ChevronRight, Loader2, Clock, Database, Scale, Truck, Car, FileText,
  Building2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Printer, Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getPeriod, fetchKpis, pctChange, fetchAlertas,
  type PeriodKey, type KpiData, type AlertaItem,
} from '@/lib/centro-control';
import { ReporteFinanciero } from '@/components/dashboard/reportes/reporte-financiero';
import { ReporteVentas } from '@/components/dashboard/reportes/reporte-ventas';
import { ReporteInventario } from '@/components/dashboard/reportes/reporte-inventario';
import { ReporteClientes } from '@/components/dashboard/reportes/reporte-clientes';
import { ReporteEjecutivo } from '@/components/dashboard/reportes/reporte-ejecutivo';
import { ReporteGalonaje } from '@/components/dashboard/reportes/reporte-galonaje';
import { ReporteCombustible } from '@/components/dashboard/reportes/reporte-combustible';
import { ReporteCarrotanques } from '@/components/dashboard/reportes/reporte-carrotanques';
import { ReporteDescuadres } from '@/components/dashboard/reportes/reporte-descuadres';
import { ReporteVales } from '@/components/dashboard/reportes/reporte-vales';
import { ReporteTalento } from '@/components/dashboard/reportes/reporte-talento';
import { ReporteParqueadero } from '@/components/dashboard/reportes/reporte-parqueadero';
import { printReport } from '@/lib/print-report';
import { callGemini } from '@/lib/gemini';

type Venta = { id: string; cliente: string; total: number; metodo_pago: string; estado: string; fecha: string; created_at: string };
type Finanza = { id: string; tipo: string; categoria: string; descripcion: string; valor: number; fecha: string };
type Producto = { id: string; nombre: string; codigo: string; categoria: string; precio_compra: number; precio_venta: number; cantidad: number; stock_minimo: number; proveedor: string; created_at: string };
type Detalle = { id: string; venta_id: string; producto_id: string; cantidad: number; precio_unitario: number; subtotal: number };
type Estacion = { id: string; nombre: string; ciudad: string | null };

type ReporteKey =
  | 'resumen' | 'ventas' | 'galonaje' | 'combustible' | 'carrotanques'
  | 'descuadres' | 'vales' | 'financiero' | 'inventario'
  | 'talento' | 'parqueadero' | 'clientes' | 'ejecutivo';

const REPORT_TABS: { key: ReporteKey; label: string; icon: typeof BarChart2 }[] = [
  { key: 'resumen', label: 'Resumen', icon: BarChart2 },
  { key: 'ventas', label: 'Ventas', icon: ShoppingCart },
  { key: 'galonaje', label: 'Galonaje', icon: Fuel },
  { key: 'combustible', label: 'Combustible', icon: Database },
  { key: 'carrotanques', label: 'Carrotanques', icon: Truck },
  { key: 'descuadres', label: 'Descuadres', icon: Scale },
  { key: 'vales', label: 'Vales y Ajustes', icon: FileText },
  { key: 'financiero', label: 'Financiero', icon: DollarSign },
  { key: 'inventario', label: 'Inventario', icon: Package },
  { key: 'talento', label: 'Talento Humano', icon: Users },
  { key: 'parqueadero', label: 'Parqueadero', icon: Car },
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'ejecutivo', label: 'Ejecutivo IA', icon: Brain },
];

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'esta_semana', label: 'Esta semana' },
  { key: 'este_mes', label: 'Este mes' },
  { key: 'mes_anterior', label: 'Mes anterior' },
  { key: 'este_anio', label: 'Este año' },
  { key: 'personalizado', label: 'Personalizado' },
];

function KpiTile({ value, label, icon, color, change }: { value: string; label: string; icon: React.ReactNode; color: string; change?: number | null }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600', cyan: 'bg-cyan-50 text-cyan-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colorMap[color] || 'bg-slate-100')}>{icon}</div>
        {change !== undefined && change !== null && (
          <span className={cn('flex items-center gap-0.5 text-xs font-semibold', change >= 0 ? 'text-emerald-600' : 'text-red-500')}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </Card>
  );
}

export default function ReportesPage() {
  const { user, empresa } = useAuth();
  const [loading, setLoading] = useState(true);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [estacionId, setEstacionId] = useState<string>('all');
  const [periodKey, setPeriodKey] = useState<PeriodKey>('este_mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [active, setActive] = useState<ReporteKey>('resumen');
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [finanzas, setFinanzas] = useState<Finanza[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const period = useMemo(() => getPeriod(periodKey, customStart, customEnd), [periodKey, customStart, customEnd]);

  const fetchBaseData = useCallback(async () => {
    const [v, f, p, d, e] = await Promise.all([
      supabase.from('ventas').select('*').order('fecha', { ascending: false }),
      supabase.from('finanzas').select('*').order('fecha', { ascending: false }),
      supabase.from('inventario').select('*').order('created_at', { ascending: false }),
      supabase.from('detalle_venta').select('*'),
      supabase.from('estaciones').select('id, nombre, ciudad').order('created_at'),
    ]);
    setVentas((v.data as Venta[]) ?? []);
    setFinanzas((f.data as Finanza[]) ?? []);
    setProductos((p.data as Producto[]) ?? []);
    setDetalles((d.data as Detalle[]) ?? []);
    setEstaciones((e.data as Estacion[]) ?? []);
  }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    const estId = estacionId === 'all' ? null : estacionId;
    const [kpis, alts] = await Promise.all([
      fetchKpis(estId, period),
      fetchAlertas(estId),
    ]);
    setKpiData(kpis);
    setAlertas(alts);
    setLoading(false);
  }, [estacionId, period]);

  useEffect(() => { if (user) fetchBaseData(); }, [user, fetchBaseData]);
  useEffect(() => { if (user) fetchReportData(); }, [user, fetchReportData]);

  const handleGenerateReport = () => {
    fetchReportData();
    setActive('resumen');
    setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
    toast.success('Reporte generado.');
  };

  const handlePrint = () => {
    if (!kpiData) return;
    const estName = estacionId === 'all' ? 'Toda la empresa' : estaciones.find((e) => e.id === estacionId)?.nombre ?? 'Estación';
    const bodyHtml = `
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Ventas</div><div class="stat-value">${kpiData.ventas.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div></div>
        <div class="stat-card"><div class="stat-label">Galones</div><div class="stat-value">${kpiData.galones.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div></div>
        <div class="stat-card"><div class="stat-label">Ingresos</div><div class="stat-value">${kpiData.ingresos.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div></div>
        <div class="stat-card"><div class="stat-label">Gastos</div><div class="stat-value">${kpiData.gastos.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div></div>
      </div>
      <div class="stat-grid">
        <div class="stat-card"><div class="stat-label">Utilidad</div><div class="stat-value">${kpiData.utilidad.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}</div></div>
        <div class="stat-card"><div class="stat-label">Inventario (gal)</div><div class="stat-value">${kpiData.inventarioGalones.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</div></div>
        <div class="stat-card"><div class="stat-label">Cuadres correctos</div><div class="stat-value">${kpiData.cuadresCorrectos}</div></div>
        <div class="stat-card"><div class="stat-label">Cuadres con diferencia</div><div class="stat-value">${kpiData.cuadresConDiferencia}</div></div>
      </div>
      <div class="section"><div class="section-title">Alertas (${alertas.length})</div>
        <table><thead><tr><th>Prioridad</th><th>Módulo</th><th>Título</th><th>Estación</th></tr></thead><tbody>
          ${alertas.slice(0, 10).map((a) => `<tr><td><span class="badge ${a.prioridad === 'critica' ? 'badge-red' : a.prioridad === 'alta' ? 'badge-amber' : 'badge-blue'}">${a.prioridad}</span></td><td>${a.modulo}</td><td>${a.titulo}</td><td>${a.estacionNombre ?? '—'}</td></tr>`).join('')}
        </tbody></table>
      </div>
    `;
    printReport('Reporte Resumen', empresa?.nombre ?? null, bodyHtml);
  };

  const handleAiSummary = async () => {
    if (!kpiData) return;
    setAiLoading(true);
    setAiSummary(null);
    try {
      const estName = estacionId === 'all' ? 'toda la empresa' : estaciones.find((e) => e.id === estacionId)?.nombre ?? 'estación';
      const prompt = `Eres un analista financiero del sistema NexoPyme AI. Analiza los siguientes datos del periodo ${period.label} para ${estName} y genera un resumen ejecutivo en español, profesional y conciso (máximo 3 párrafos). NO inventes datos.

Datos disponibles:
- Ventas totales: ${kpiData.ventas.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
- Galones vendidos: ${kpiData.galones.toLocaleString('es-CO')}
- Ingresos: ${kpiData.ingresos.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
- Gastos: ${kpiData.gastos.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
- Utilidad: ${kpiData.utilidad.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
- Cuadres correctos: ${kpiData.cuadresCorrectos}
- Cuadres con diferencia: ${kpiData.cuadresConDiferencia}
- Faltantes total: ${kpiData.faltantesTotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
- Tanques normales: ${kpiData.tanquesNormales}
- Tanques bajos: ${kpiData.tanquesBajos}
- Tanques críticos: ${kpiData.tanquesCriticos}
- Entradas de combustible: ${kpiData.carrotanquesGalones.toLocaleString('es-CO')} galones (${kpiData.carrotanquesCount} entradas)
- Empleados activos: ${kpiData.empleadosActivos}
- Ingresos parqueadero: ${kpiData.parqueaderoIngresos.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
- Vehículos parqueadero: ${kpiData.parqueaderoVehiculos}
- Alertas activas: ${alertas.length}

Después del resumen, incluye:
"Aspectos destacados" (bullet points con los puntos más relevantes)
"Recomendaciones" (acciones administrativas sugeridas basadas en los datos)

Si no hay suficientes datos, di: "No hay información suficiente para generar este análisis."`;

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
      if (!apiKey) {
        setAiSummary('No hay información suficiente para generar este análisis. (API key no configurada)');
      } else {
        const result = await callGemini(apiKey, prompt);
        setAiSummary(result);
      }
    } catch (err) {
      setAiSummary('No se pudo generar el análisis en este momento. Intenta más tarde.');
    } finally {
      setAiLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('es-CO', { dateStyle: 'long' });
  const fmtCOP = (v: number) => v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reportes</h1>
            <p className="text-sm text-slate-500">Consulta, analiza y descarga la información de tu empresa.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-500">{today}</span>
        </div>
      </div>

      {/* Controls: Station selector + Period selector */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Estación</Label>
            <Select value={estacionId} onValueChange={setEstacionId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda la empresa</SelectItem>
                {estaciones.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Periodo</Label>
            <Select value={periodKey} onValueChange={(v) => setPeriodKey(v as PeriodKey)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {periodKey === 'personalizado' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Fecha inicial</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Fecha final</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-9 text-sm" />
              </div>
            </>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={handleGenerateReport} className="bg-amber-600 hover:bg-amber-700 gap-1.5 text-sm">
            <BarChart2 className="h-4 w-4" />Generar reporte
          </Button>
        </div>
      </Card>

      {/* Report tabs */}
      <div className="mb-5 overflow-x-auto">
        <div className="flex gap-1.5 pb-1">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActive(tab.key); setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80); }}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium transition-all',
                active === tab.key ? 'bg-amber-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report content */}
      <div ref={reportRef} className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft min-h-[400px]">
        {loading && !kpiData ? (
          <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div>
        ) : (
          <>
            {/* RESUMEN */}
            {active === 'resumen' && kpiData && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Resumen general — {period.label}</h2>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs"><Printer className="h-3.5 w-3.5" />Imprimir</Button>
                  </div>
                </div>

                {/* Ventas */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ventas</p>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KpiTile value={fmtCOP(kpiData.ventas)} label="Ventas totales" icon={<ShoppingCart className="h-4 w-4" />} color="blue" change={pctChange(kpiData.ventas, kpiData.prevVentas)} />
                    <KpiTile value={String(kpiData.cuadresCorrectos + kpiData.cuadresConDiferencia)} label="Núm. ventas/cuadres" icon={<Database className="h-4 w-4" />} color="slate" />
                    <KpiTile value={kpiData.galones.toLocaleString('es-CO', { maximumFractionDigits: 0 })} label="Galones vendidos" icon={<Fuel className="h-4 w-4" />} color="amber" change={pctChange(kpiData.galones, kpiData.prevGalones)} />
                    <KpiTile value={fmtCOP(kpiData.cuadresCorrectos + kpiData.cuadresConDiferencia > 0 ? kpiData.ventas / (kpiData.cuadresCorrectos + kpiData.cuadresConDiferencia) : 0)} label="Venta promedio" icon={<TrendingUp className="h-4 w-4" />} color="emerald" />
                  </div>
                </div>

                {/* Combustible */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Combustible</p>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KpiTile value={kpiData.inventarioGalones.toLocaleString('es-CO', { maximumFractionDigits: 0 })} label="Inventario actual" icon={<Database className="h-4 w-4" />} color="cyan" />
                    <KpiTile value={kpiData.carrotanquesGalones.toLocaleString('es-CO', { maximumFractionDigits: 0 })} label="Entradas" icon={<Truck className="h-4 w-4" />} color="blue" />
                    <KpiTile value={kpiData.galones.toLocaleString('es-CO', { maximumFractionDigits: 0 })} label="Galones vendidos" icon={<Fuel className="h-4 w-4" />} color="amber" />
                    <KpiTile value={String(kpiData.tanquesBajos + kpiData.tanquesCriticos)} label="Tanques en alerta" icon={<AlertTriangle className="h-4 w-4" />} color="red" />
                  </div>
                </div>

                {/* Finanzas */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Finanzas</p>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KpiTile value={fmtCOP(kpiData.ingresos)} label="Ingresos" icon={<TrendingUp className="h-4 w-4" />} color="emerald" change={pctChange(kpiData.ingresos, kpiData.prevIngresos)} />
                    <KpiTile value={fmtCOP(kpiData.gastos)} label="Gastos" icon={<TrendingDown className="h-4 w-4" />} color="red" change={pctChange(kpiData.gastos, kpiData.prevGastos)} />
                    <KpiTile value={fmtCOP(kpiData.utilidad)} label="Utilidad" icon={<DollarSign className="h-4 w-4" />} color="blue" />
                    <KpiTile value={fmtCOP(kpiData.faltantesTotal)} label="Faltantes/descuadres" icon={<Scale className="h-4 w-4" />} color="amber" />
                  </div>
                </div>

                {/* Inventario + Talento + Parqueadero */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Operación</p>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <KpiTile value={String(productos.length)} label="Productos registrados" icon={<Package className="h-4 w-4" />} color="slate" />
                    <KpiTile value={String(productos.filter((p) => p.cantidad <= p.stock_minimo).length)} label="Stock bajo" icon={<AlertTriangle className="h-4 w-4" />} color="amber" />
                    <KpiTile value={String(kpiData.empleadosActivos)} label="Empleados activos" icon={<Users className="h-4 w-4" />} color="violet" />
                    <KpiTile value={fmtCOP(kpiData.parqueaderoIngresos)} label="Ingresos parqueadero" icon={<Car className="h-4 w-4" />} color="blue" />
                  </div>
                </div>

                {/* Alertas */}
                {alertas.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Alertas activas ({alertas.length})</p>
                    <div className="space-y-2">
                      {alertas.slice(0, 8).map((a) => (
                        <div key={a.id} className={cn(
                          'flex items-start gap-3 rounded-xl border p-3',
                          a.prioridad === 'critica' ? 'border-red-200 bg-red-50/50' : a.prioridad === 'alta' ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 bg-slate-50/50'
                        )}>
                          {a.prioridad === 'critica' ? <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" /> : a.prioridad === 'alta' ? <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 text-blue-400 mt-0.5" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">{a.titulo}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{a.descripcion}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <Badge className={cn('text-[10px]', a.prioridad === 'critica' ? 'bg-red-50 text-red-700' : a.prioridad === 'alta' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700')}>{a.prioridad}</Badge>
                            <p className="mt-1 text-[10px] text-slate-400">{a.estacionNombre ?? '—'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <h3 className="text-sm font-bold text-slate-900">Análisis NexoPyme AI</h3>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleAiSummary} disabled={aiLoading} className="gap-1.5 text-xs">
                      {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                      {aiLoading ? 'Generando…' : 'Generar análisis'}
                    </Button>
                  </div>
                  {aiSummary ? (
                    <div className="prose prose-sm max-w-none text-sm text-slate-700 whitespace-pre-wrap">{aiSummary}</div>
                  ) : (
                    <p className="text-xs text-slate-500">Haz clic en "Generar análisis" para obtener un resumen inteligente de los datos del periodo.</p>
                  )}
                </div>
              </div>
            )}

            {/* Other reports */}
            {active === 'ventas' && <ReporteVentas ventas={ventas} detalles={detalles} productos={productos} empresa={empresa?.nombre ?? null} />}
            {active === 'galonaje' && <ReporteGalonaje estaciones={estaciones} />}
            {active === 'combustible' && <ReporteCombustible estaciones={estaciones} estacionId={estacionId} />}
            {active === 'carrotanques' && <ReporteCarrotanques estaciones={estaciones} estacionId={estacionId} />}
            {active === 'descuadres' && <ReporteDescuadres estaciones={estaciones} estacionId={estacionId} />}
            {active === 'vales' && <ReporteVales estaciones={estaciones} estacionId={estacionId} />}
            {active === 'financiero' && <ReporteFinanciero finanzas={finanzas} ventas={ventas} empresa={empresa?.nombre ?? null} />}
            {active === 'inventario' && <ReporteInventario productos={productos} detalles={detalles} empresa={empresa?.nombre ?? null} />}
            {active === 'talento' && <ReporteTalento estaciones={estaciones} estacionId={estacionId} />}
            {active === 'parqueadero' && <ReporteParqueadero estacionId={estacionId} />}
            {active === 'clientes' && <ReporteClientes ventas={ventas} empresa={empresa?.nombre ?? null} />}
            {active === 'ejecutivo' && <ReporteEjecutivo ventas={ventas} finanzas={finanzas} productos={productos} detalles={detalles} empresa={empresa?.nombre ?? null} />}
          </>
        )}
      </div>
    </div>
  );
}
