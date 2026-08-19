'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Fuel, TrendingUp, TrendingDown, DollarSign, Droplet,
  AlertTriangle, CheckCircle2, Truck, Users, Car, Loader2, RefreshCw,
  ArrowUpRight, ArrowDownRight, Minus, Calendar, Building2, Bell,
  ShieldAlert, Lightbulb, Award, BarChart3, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  getPeriod, fetchKpis, fetchEstacionRanking, fetchAlertas,
  fetchProductSales, fetchDailyData, pctChange,
  type PeriodKey, type KpiData, type EstacionRanking, type AlertaItem,
  type ProductSales, type DailyData,
} from '@/lib/centro-control';

type Estacion = { id: string; nombre: string; ciudad: string | null };

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: '7dias', label: 'Últimos 7 días' },
  { key: '30dias', label: 'Últimos 30 días' },
  { key: 'esta_semana', label: 'Esta semana' },
  { key: 'este_mes', label: 'Este mes' },
  { key: 'mes_anterior', label: 'Mes anterior' },
  { key: 'este_anio', label: 'Este año' },
  { key: 'anio_anterior', label: 'Año anterior' },
  { key: 'personalizado', label: 'Personalizado' },
];

const PRIO_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critica: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'CRÍTICA' },
  alta: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'ALTA' },
  media: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'MEDIA' },
  baja: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'BAJA' },
};

function fmtCOP(n: number): string {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtGal(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' gal';
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function CentroControlPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [selectedEstacion, setSelectedEstacion] = useState<string>('all');
  const [periodKey, setPeriodKey] = useState<PeriodKey>('este_mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [ranking, setRanking] = useState<EstacionRanking[]>([]);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  const period = useMemo(() => getPeriod(periodKey, customStart, customEnd), [periodKey, customStart, customEnd]);
  const estacionId = selectedEstacion === 'all' ? null : selectedEstacion;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [k, r, a, p, d] = await Promise.all([
        fetchKpis(estacionId, period),
        estacionId === null ? fetchEstacionRanking(period) : Promise.resolve([]),
        fetchAlertas(estacionId),
        fetchProductSales(estacionId, period),
        fetchDailyData(estacionId, period),
      ]);
      setKpis(k);
      setRanking(r);
      setAlertas(a);
      setProductSales(p);
      setDailyData(d);
    } catch (err) {
      console.error('[CentroControl] Error:', err);
      toast.error('Error al cargar los datos del Centro de Control.');
    } finally {
      setLoading(false);
    }
  }, [estacionId, period]);

  useEffect(() => {
    async function loadEstaciones() {
      const { data } = await supabase.from('estaciones').select('id, nombre, ciudad').order('created_at');
      setEstaciones((data as Estacion[]) ?? []);
    }
    if (user) loadEstaciones();
  }, [user]);

  useEffect(() => {
    if (user && period.start) fetchAll();
  }, [user, fetchAll]);

  // Compute changes
  const ventasChange = kpis ? pctChange(kpis.ventas, kpis.prevVentas) : null;
  const galonesChange = kpis ? pctChange(kpis.galones, kpis.prevGalones) : null;
  const ingresosChange = kpis ? pctChange(kpis.ingresos, kpis.prevIngresos) : null;
  const gastosChange = kpis ? pctChange(kpis.gastos, kpis.prevGastos) : null;
  const cuadrePct = kpis && (kpis.cuadresCorrectos + kpis.cuadresConDiferencia) > 0
    ? Math.round((kpis.cuadresCorrectos / (kpis.cuadresCorrectos + kpis.cuadresConDiferencia)) * 100)
    : null;

  const topProduct = productSales.length > 0 ? productSales[0] : null;
  const topProductPct = topProduct && kpis && kpis.galones > 0
    ? (topProduct.galones / kpis.galones) * 100
    : null;

  // Recomendaciones based on real data
  const recomendaciones = useMemo(() => {
    if (!kpis) return [];
    const recs: { titulo: string; desc: string; icon: typeof Lightbulb; color: string; bg: string }[] = [];

    if (kpis.tanquesCriticos > 0) {
      recs.push({ titulo: 'Abastecimiento urgente', desc: `${kpis.tanquesCriticos} tanque(s) en nivel crítico. Programar carrotanque inmediatamente.`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' });
    }
    if (kpis.tanquesBajos > 0) {
      recs.push({ titulo: 'Programar abastecimiento', desc: `${kpis.tanquesBajos} tanque(s) con nivel bajo. Considerar programar pedido de combustible.`, icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50' });
    }
    if (kpis.cuadresConDiferencia > 0) {
      recs.push({ titulo: 'Revisar cuadres', desc: `${kpis.cuadresConDiferencia} turno(s) con diferencias. Faltantes: ${fmtCOP(kpis.faltantesTotal)}.`, icon: ShieldAlert, color: 'text-amber-600', bg: 'bg-amber-50' });
    }
    if (ventasChange !== null && ventasChange < -10) {
      recs.push({ titulo: 'Caída de ventas', desc: `Las ventas disminuyeron ${Math.abs(ventasChange).toFixed(1)}% frente al periodo anterior. Revisar estrategia comercial.`, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50' });
    }
    if (galonesChange !== null && galonesChange > 5) {
      recs.push({ titulo: 'Aumento de galonaje', desc: `El galonaje aumentó ${galonesChange.toFixed(1)}% frente al periodo anterior. Asegurar suficiente inventario.`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' });
    }
    if (kpis.gastos > kpis.ingresos && kpis.ingresos > 0) {
      recs.push({ titulo: 'Gastos superiores a ingresos', desc: `Los gastos (${fmtCOP(kpis.gastos)}) superan los ingresos (${fmtCOP(kpis.ingresos)}).`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' });
    }
    if (recs.length === 0 && kpis.galones > 0) {
      recs.push({ titulo: 'Operación normal', desc: 'No se detectan problemas críticos. El sistema está funcionando dentro de parámetros normales.', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' });
    }
    return recs;
  }, [kpis, ventasChange, galonesChange]);

  if (loading && !kpis) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-soft">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Centro de Control</h1>
          <p className="text-sm text-slate-500">Estado consolidado de tu empresa</p>
        </div>
        <button onClick={fetchAll} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition-colors">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Global filters */}
      <Card className="mb-6 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Station selector */}
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-400" />
            <Select value={selectedEstacion} onValueChange={setSelectedEstacion}>
              <SelectTrigger className="w-48 border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda la empresa</SelectItem>
                {estaciones.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <Select value={periodKey} onValueChange={(v) => setPeriodKey(v as PeriodKey)}>
              <SelectTrigger className="w-40 border-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom date range */}
          {periodKey === 'personalizado' && (
            <div className="flex items-center gap-2">
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-36" />
              <span className="text-slate-400 text-xs">→</span>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-36" />
            </div>
          )}

          <div className="ml-auto text-xs text-slate-400">
            Periodo: <span className="font-semibold text-slate-600">{period.start}</span> a <span className="font-semibold text-slate-600">{period.end}</span>
          </div>
        </div>
      </Card>

      {kpis && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              label="Ventas" value={fmtCOP(kpis.ventas)} icon={<DollarSign className="h-5 w-5" />}
              color="blue" change={ventasChange}
            />
            <KpiCard
              label="Galones vendidos" value={fmtNum(kpis.galones)} icon={<Droplet className="h-5 w-5" />}
              color="emerald" change={galonesChange}
            />
            <KpiCard
              label="Ingresos" value={fmtCOP(kpis.ingresos)} icon={<TrendingUp className="h-5 w-5" />}
              color="violet" change={ingresosChange}
            />
            <KpiCard
              label="Gastos" value={fmtCOP(kpis.gastos)} icon={<TrendingDown className="h-5 w-5" />}
              color="amber" change={gastosChange} invertChange
            />
          </div>

          {/* Secondary KPIs */}
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniKpi label="Inventario actual" value={fmtGal(kpis.inventarioGalones)} icon={<Fuel className="h-4 w-4" />} color="text-blue-600 bg-blue-50" />
            <MiniKpi
              label="Cuadres correctos"
              value={cuadrePct !== null ? `${cuadrePct}%` : 'Sin datos'}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color={cuadrePct !== null && cuadrePct >= 90 ? 'text-emerald-600 bg-emerald-50' : cuadrePct !== null ? 'text-amber-600 bg-amber-50' : 'text-slate-400 bg-slate-50'}
            />
            <MiniKpi label="Tanques en alerta" value={String(kpis.tanquesBajos + kpis.tanquesCriticos)} icon={<AlertTriangle className="h-4 w-4" />} color={kpis.tanquesCriticos > 0 ? 'text-red-600 bg-red-50' : kpis.tanquesBajos > 0 ? 'text-orange-600 bg-orange-50' : 'text-emerald-600 bg-emerald-50'} />
            <MiniKpi label="Empleados activos" value={String(kpis.empleadosActivos)} icon={<Users className="h-4 w-4" />} color="text-violet-600 bg-violet-50" />
          </div>

          {/* Charts row */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Daily evolution */}
            <Card className="lg:col-span-2 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Evolución diaria</h3>
                  <p className="text-xs text-slate-400">Galones y entradas de combustible</p>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Galones</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Entradas</span>
                </div>
              </div>
              {dailyData.length > 0 && dailyData.some((d) => d.galones > 0 || d.entradas > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorEnt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="galones" stroke="#10b981" strokeWidth={2} fill="url(#colorGal)" name="Galones" />
                    <Area type="monotone" dataKey="entradas" stroke="#3b82f6" strokeWidth={2} fill="url(#colorEnt)" name="Entradas" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">No hay datos suficientes para este periodo.</div>
              )}
            </Card>

            {/* Product distribution */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900">Distribución por combustible</h3>
              <p className="text-xs text-slate-400">Galonaje por producto</p>
              {productSales.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={productSales} dataKey="galones" nameKey="nombre" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {productSales.map((p, i) => <Cell key={i} fill={p.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} formatter={(v: number) => fmtGal(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1.5">
                    {productSales.map((p) => (
                      <div key={p.nombre} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />{p.nombre}</span>
                        <span className="font-bold text-slate-700">{fmtNum(p.galones)} gal</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">No hay datos suficientes.</div>
              )}
            </Card>
          </div>

          {/* Product highlight + Cuadres + Alerts */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Top product */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Award className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Producto más vendido</h3>
              </div>
              {topProduct ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: topProduct.color + '20' }}>
                      <Fuel className="h-6 w-6" style={{ color: topProduct.color }} />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{topProduct.nombre}</p>
                      <p className="text-xs text-slate-400">{fmtNum(topProduct.galones)} galones vendidos</p>
                    </div>
                  </div>
                  {topProductPct !== null && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-500">Participación del galonaje</span>
                        <span className="font-bold text-slate-700">{topProductPct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${topProductPct}%`, background: topProduct.color }} />
                      </div>
                    </div>
                  )}
                  <div className="mt-4 space-y-1 border-t border-slate-100 pt-3">
                    {productSales.slice(1).map((p) => (
                      <div key={p.nombre} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{p.nombre}</span>
                        <span className="font-semibold text-slate-700">{fmtNum(p.galones)} gal</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-slate-400">No hay datos suficientes.</div>
              )}
            </Card>

            {/* Cuadres control */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900">Control de cuadres</h3>
              </div>
              {(kpis.cuadresCorrectos + kpis.cuadresConDiferencia) > 0 ? (
                <>
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-20 w-20 items-center justify-center">
                      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke={cuadrePct && cuadrePct >= 90 ? '#10b981' : '#f59e0b'} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${((cuadrePct ?? 0) / 100) * 214} 214`} />
                      </svg>
                      <span className="absolute text-sm font-bold text-slate-900">{cuadrePct}%</span>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Correctos</span><span className="font-bold text-emerald-600">{kpis.cuadresCorrectos}</span></div>
                      <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Con diferencias</span><span className="font-bold text-amber-600">{kpis.cuadresConDiferencia}</span></div>
                      <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Faltantes total</span><span className="font-bold text-red-600">{fmtCOP(kpis.faltantesTotal)}</span></div>
                      <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Sobrantes total</span><span className="font-bold text-blue-600">{fmtCOP(kpis.sobrantesTotal)}</span></div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-slate-400">No hay datos de cuadres para este periodo.</div>
              )}
            </Card>

            {/* Alerts summary */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-bold text-slate-900">Alertas activas</h3>
                {alertas.length > 0 && <Badge className="ml-auto bg-red-50 text-red-700">{alertas.length}</Badge>}
              </div>
              {alertas.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {alertas.slice(0, 5).map((a) => {
                    const st = PRIO_STYLES[a.prioridad];
                    return (
                      <div key={a.id} className={cn('rounded-lg border p-2.5', st.border, st.bg)}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={cn('text-[10px] font-bold', st.text)}>{st.label}</span>
                          {a.estacionNombre && <span className="text-[10px] text-slate-400">{a.estacionNombre}</span>}
                        </div>
                        <p className="text-xs font-semibold text-slate-800">{a.titulo}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-2">{a.descripcion}</p>
                      </div>
                    );
                  })}
                  {alertas.length > 5 && <p className="text-xs text-center text-slate-400">+{alertas.length - 5} alerta(s) más</p>}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center flex-col">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <p className="mt-2 text-xs text-slate-400">Sin alertas activas</p>
                </div>
              )}
            </Card>
          </div>

          {/* Station ranking (only for "all" mode) */}
          {selectedEstacion === 'all' && ranking.length > 0 && (
            <Card className="mt-6 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-bold text-slate-900">Comparación de estaciones</h3>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ranking} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="nombre" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} formatter={(v: number) => fmtCOP(v)} />
                  <Bar dataKey="ventas" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Ventas" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-2">
                {ranking.map((r, i) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                    <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold', i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-400')}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{r.nombre}</p>
                      <p className="text-xs text-slate-400">{fmtNum(r.galones)} gal · {r.diferencias} diferencias · {r.tanquesBajos} tanques en alerta</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{fmtCOP(r.ventas)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Full alerts + Recomendaciones */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Full alerts list */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-bold text-slate-900">Centro de alertas</h3>
              </div>
              {alertas.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {alertas.map((a) => {
                    const st = PRIO_STYLES[a.prioridad];
                    return (
                      <div key={a.id} className={cn('rounded-lg border p-3', st.border, st.bg)}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', st.bg, st.text)}>{st.label}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            {a.estacionNombre && <span>{a.estacionNombre}</span>}
                            <span>{a.fecha}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{a.titulo}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{a.descripcion}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{a.modulo}</Badge>
                          <span className="text-[10px] text-slate-400">NUEVA</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center flex-col">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  <p className="mt-2 text-sm text-slate-500">No hay alertas activas</p>
                </div>
              )}
            </Card>

            {/* Recomendaciones */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Recomendaciones</h3>
              </div>
              {recomendaciones.length > 0 ? (
                <div className="space-y-3">
                  {recomendaciones.map((r, i) => (
                    <div key={i} className={cn('flex items-start gap-3 rounded-xl p-3', r.bg)}>
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white', r.color)}>
                        <r.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{r.titulo}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-slate-400">No hay datos suficientes para generar recomendaciones.</div>
              )}
            </Card>
          </div>

          {/* Additional info: Carrotanques + Parqueadero */}
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900">Carrotanques</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Recibidos en el periodo</span><span className="text-sm font-bold text-slate-900">{kpis.carrotanquesCount}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Galones recibidos</span><span className="text-sm font-bold text-blue-600">{fmtNum(kpis.carrotanquesGalones)} gal</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Galones vendidos</span><span className="text-sm font-bold text-emerald-600">{fmtNum(kpis.galones)} gal</span></div>
                {kpis.carrotanquesGalones > 0 && kpis.galones > 0 && (
                  <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                    Relación entradas/ventas: {((kpis.carrotanquesGalones / kpis.galones) * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Car className="h-4 w-4 text-violet-500" />
                <h3 className="text-sm font-bold text-slate-900">Parqueadero</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Vehículos en el periodo</span><span className="text-sm font-bold text-slate-900">{kpis.parqueaderoVehiculos}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Ingresos parqueadero</span><span className="text-sm font-bold text-violet-600">{fmtCOP(kpis.parqueaderoIngresos)}</span></div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900">Inventario</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Inventario total</span><span className="text-sm font-bold text-slate-900">{fmtGal(kpis.inventarioGalones)}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Tanques normales</span><span className="text-sm font-bold text-emerald-600">{kpis.tanquesNormales}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Tanques bajos</span><span className="text-sm font-bold text-orange-600">{kpis.tanquesBajos}</span></div>
                <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Tanques críticos</span><span className="text-sm font-bold text-red-600">{kpis.tanquesCriticos}</span></div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, color, change, invertChange }: {
  label: string; value: string; icon: React.ReactNode; color: string;
  change: number | null; invertChange?: boolean;
}) {
  const cm: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600',
  };
  const showChange = change !== null;
  const isPositive = invertChange ? (change ?? 0) < 0 : (change ?? 0) > 0;
  const isNeutral = change === 0;

  return (
    <Card className="p-5 transition-shadow hover:shadow-soft-lg">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cm[color])}>{icon}</div>
      <p className="mt-3 text-xl font-bold tracking-tight text-slate-900">{value}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <p className="text-xs text-slate-500">{label}</p>
        {showChange && !isNeutral && (
          <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-bold', isPositive ? 'text-emerald-600' : 'text-red-600')}>
            {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change!).toFixed(1)}%
          </span>
        )}
        {showChange && isNeutral && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400">
            <Minus className="h-3 w-3" />0%
          </span>
        )}
      </div>
    </Card>
  );
}

function MiniKpi({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', color)}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
          <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}
