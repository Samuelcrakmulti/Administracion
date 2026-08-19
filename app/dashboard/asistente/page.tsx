'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Brain, Activity, AlertTriangle, Lightbulb, MessageSquare, Send, User,
  Sparkles, Loader2, Bot, CheckCircle2, Building2, Fuel, Droplet,
  TrendingUp, TrendingDown, ShieldAlert, Car, Truck, Users, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { callGemini } from '@/lib/gemini';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import {
  getPeriod, fetchKpis, fetchAlertas, fetchProductSales,
  type PeriodKey, type KpiData, type AlertaItem, type ProductSales,
} from '@/lib/centro-control';

type Estacion = { id: string; nombre: string };
type Message = { role: 'user' | 'ai' | 'error'; content: string };
type TabKey = 'diagnostico' | 'alertas' | 'recomendaciones' | 'chat';

const tabs: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: 'diagnostico', label: 'Diagnóstico', icon: Activity },
  { key: 'alertas', label: 'Alertas', icon: AlertTriangle },
  { key: 'recomendaciones', label: 'Recomendaciones', icon: Lightbulb },
  { key: 'chat', label: 'Consultar IA', icon: MessageSquare },
];

function fmtCOP(n: number): string {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtGal(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' gal';
}

export default function CentroInteligentePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('diagnostico');
  const [loading, setLoading] = useState(true);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [selectedEstacion, setSelectedEstacion] = useState<string>('all');
  const [periodKey] = useState<PeriodKey>('este_mes');
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);

  const period = useMemo(() => getPeriod(periodKey), [periodKey]);
  const estacionId = selectedEstacion === 'all' ? null : selectedEstacion;
  const estacionNombre = selectedEstacion === 'all'
    ? 'Toda la empresa'
    : estaciones.find((e) => e.id === selectedEstacion)?.nombre ?? 'Estación';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [k, a, p] = await Promise.all([
        fetchKpis(estacionId, period),
        fetchAlertas(estacionId),
        fetchProductSales(estacionId, period),
      ]);
      setKpis(k);
      setAlertas(a);
      setProductSales(p);
    } catch (err) {
      console.error('[CentroInteligente] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [estacionId, period]);

  useEffect(() => {
    async function loadEstaciones() {
      const { data } = await supabase.from('estaciones').select('id, nombre').order('created_at');
      setEstaciones((data as Estacion[]) ?? []);
    }
    if (user) loadEstaciones();
  }, [user]);

  useEffect(() => {
    if (user && period.start) fetchData();
  }, [user, fetchData]);

  // ===== DIAGNÓSTICO =====
  const diagnostico = useMemo(() => {
    if (!kpis) return null;
    const cuadrePct = (kpis.cuadresCorrectos + kpis.cuadresConDiferencia) > 0
      ? Math.round((kpis.cuadresCorrectos / (kpis.cuadresCorrectos + kpis.cuadresConDiferencia)) * 100)
      : null;

    const ventasChange = kpis.prevVentas > 0 ? ((kpis.ventas - kpis.prevVentas) / kpis.prevVentas) * 100 : null;

    let saludFinanciera = 50;
    if (kpis.ingresos > 0 || kpis.gastos > 0) {
      if (kpis.ingresos > 0 && kpis.gastos === 0) saludFinanciera = 100;
      else if (kpis.ingresos > kpis.gastos) {
        saludFinanciera = Math.min(100, Math.round(50 + (kpis.utilidad / kpis.ingresos) * 50));
      } else {
        const deficit = kpis.gastos > 0 ? (kpis.ingresos - kpis.gastos) / kpis.gastos : -1;
        saludFinanciera = Math.max(0, Math.round(50 + deficit * 50));
      }
    }

    const estadoVentas = ventasChange !== null
      ? Math.max(0, Math.min(100, Math.round(50 + ventasChange * 0.5)))
      : kpis.ventas > 0 ? 70 : 50;

    const totalTanques = kpis.tanquesNormales + kpis.tanquesBajos + kpis.tanquesCriticos;
    const estadoInventario = totalTanques > 0
      ? Math.round((kpis.tanquesNormales / totalTanques) * 100)
      : kpis.inventarioGalones > 0 ? 70 : 50;

    const puntajeGeneral = Math.round((saludFinanciera + estadoVentas + estadoInventario) / 3);

    return {
      hayDatos: kpis.galones > 0 || kpis.ventas > 0 || kpis.inventarioGalones > 0 || totalTanques > 0,
      saludFinanciera, estadoVentas, estadoInventario, puntajeGeneral,
      ventas: kpis.ventas, galones: kpis.galones, ingresos: kpis.ingresos, gastos: kpis.gastos,
      utilidad: kpis.utilidad, ventasChange,
      cuadrePct, cuadresCorrectos: kpis.cuadresCorrectos, cuadresConDiferencia: kpis.cuadresConDiferencia,
      faltantesTotal: kpis.faltantesTotal, sobrantesTotal: kpis.sobrantesTotal,
      inventarioGalones: kpis.inventarioGalones,
      tanquesNormales: kpis.tanquesNormales, tanquesBajos: kpis.tanquesBajos, tanquesCriticos: kpis.tanquesCriticos,
      carrotanquesGalones: kpis.carrotanquesGalones, carrotanquesCount: kpis.carrotanquesCount,
      empleadosActivos: kpis.empleadosActivos,
      parqueaderoIngresos: kpis.parqueaderoIngresos, parqueaderoVehiculos: kpis.parqueaderoVehiculos,
    };
  }, [kpis]);

  // ===== RECOMENDACIONES =====
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
    const ventasChange = kpis.prevVentas > 0 ? ((kpis.ventas - kpis.prevVentas) / kpis.prevVentas) * 100 : null;
    if (ventasChange !== null && ventasChange < -10) {
      recs.push({ titulo: 'Caída de ventas', desc: `Las ventas disminuyeron ${Math.abs(ventasChange).toFixed(1)}% frente al periodo anterior.`, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50' });
    }
    if (kpis.gastos > kpis.ingresos && kpis.ingresos > 0) {
      recs.push({ titulo: 'Gastos superiores a ingresos', desc: `Gastos: ${fmtCOP(kpis.gastos)} vs Ingresos: ${fmtCOP(kpis.ingresos)}.`, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' });
    }
    if (productSales.length > 0 && kpis.galones > 0) {
      const top = productSales[0];
      const pct = (top.galones / kpis.galones) * 100;
      if (pct > 50) {
        recs.push({ titulo: `Alta concentración en ${top.nombre}`, desc: `${top.nombre} representa el ${pct.toFixed(0)}% del galonaje. Considerar diversificar o asegurar abastecimiento.`, icon: Droplet, color: 'text-blue-600', bg: 'bg-blue-50' });
      }
    }
    if (recs.length === 0 && kpis.galones > 0) {
      recs.push({ titulo: 'Operación normal', desc: 'No se detectan problemas críticos en el periodo actual.', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' });
    }
    return recs;
  }, [kpis, productSales]);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
          <Brain className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Centro Inteligente</h1>
          <p className="text-sm text-slate-500">Tu consultor empresarial impulsado por IA con datos reales</p>
        </div>
        {/* Station selector */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-slate-400" />
          <Select value={selectedEstacion} onValueChange={setSelectedEstacion}>
            <SelectTrigger className="w-44 border-slate-200"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda la empresa</SelectItem>
              {estaciones.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
              activeTab === tab.key
                ? 'bg-primary text-white shadow-soft'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {activeTab === 'diagnostico' && diagnostico && <DiagnosticoSection data={diagnostico} estacionNombre={estacionNombre} productSales={productSales} />}
          {activeTab === 'alertas' && <AlertasSection alertas={alertas} />}
          {activeTab === 'recomendaciones' && <RecomendacionesSection recomendaciones={recomendaciones} />}
          {activeTab === 'chat' && <ChatSection kpis={kpis} alertas={alertas} productSales={productSales} estacionNombre={estacionNombre} period={period} />}
        </>
      )}
    </div>
  );
}

// ===== DIAGNÓSTICO =====
function DiagnosticoSection({ data, estacionNombre, productSales }: {
  data: NonNullable<ReturnType<typeof useDiagnostico>>;
  estacionNombre: string;
  productSales: ProductSales[];
}) {
  if (!data.hayDatos) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Activity className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">No hay datos suficientes</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          El sistema necesita más información para generar un diagnóstico de {estacionNombre}.
          Registra lecturas, cuadres y ventas en el módulo de Estaciones para obtener un análisis completo.
        </p>
      </Card>
    );
  }

  const scoreColor = data.puntajeGeneral >= 70 ? 'text-emerald-600' : data.puntajeGeneral >= 40 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(214 32% 91%)" strokeWidth="10" />
              <circle
                cx="60" cy="60" r="52" fill="none"
                stroke={data.puntajeGeneral >= 70 ? '#10b981' : data.puntajeGeneral >= 40 ? '#f59e0b' : '#ef4444'}
                strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(data.puntajeGeneral / 100) * 327} 327`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={cn('text-3xl font-bold', scoreColor)}>{data.puntajeGeneral}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">Estado de {estacionNombre}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {data.puntajeGeneral >= 70 ? 'La operación se encuentra en un estado saludable.'
                : data.puntajeGeneral >= 40 ? 'Se detectan áreas de mejora. Revisa las recomendaciones.'
                : 'Requiere atención inmediata. Revisa las alertas y recomendaciones.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Ventas</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{fmtCOP(data.ventas)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Galones</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{data.galones.toLocaleString('es-CO')}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Utilidad</p>
                <p className={cn('mt-1 text-sm font-bold', data.utilidad >= 0 ? 'text-emerald-600' : 'text-red-600')}>{fmtCOP(data.utilidad)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-xs text-slate-500">Inventario</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{data.inventarioGalones.toLocaleString('es-CO')} gal</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <HealthBar label="Salud Financiera" value={data.saludFinanciera} icon={<TrendingUp className="h-5 w-5" />} color="emerald" />
        <HealthBar label="Estado de Ventas" value={data.estadoVentas} icon={<Activity className="h-5 w-5" />} color="blue" />
        <HealthBar label="Estado de Inventario" value={data.estadoInventario} icon={<Fuel className="h-5 w-5" />} color="amber" />
      </div>

      {/* Detailed stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cuadres correctos" value={data.cuadrePct !== null ? `${data.cuadrePct}%` : 'Sin datos'} icon={<CheckCircle2 className="h-4 w-4" />} color={data.cuadrePct !== null && data.cuadrePct >= 90 ? 'emerald' : 'amber'} />
        <StatCard label="Faltantes total" value={fmtCOP(data.faltantesTotal)} icon={<TrendingDown className="h-4 w-4" />} color="red" />
        <StatCard label="Tanques en alerta" value={String(data.tanquesBajos + data.tanquesCriticos)} icon={<AlertTriangle className="h-4 w-4" />} color={data.tanquesCriticos > 0 ? 'red' : data.tanquesBajos > 0 ? 'amber' : 'emerald'} />
        <StatCard label="Carrotanques" value={`${data.carrotanquesCount} (${data.carrotanquesGalones.toLocaleString('es-CO')} gal)`} icon={<Truck className="h-4 w-4" />} color="blue" />
        <StatCard label="Empleados activos" value={String(data.empleadosActivos)} icon={<Users className="h-4 w-4" />} color="violet" />
        <StatCard label="Parqueadero" value={`${data.parqueaderoVehiculos} vehículos`} icon={<Car className="h-4 w-4" />} color="violet" />
        <StatCard label="Sobrantes total" value={fmtCOP(data.sobrantesTotal)} icon={<TrendingUp className="h-4 w-4" />} color="blue" />
        <StatCard label="Inventario total" value={fmtGal(data.inventarioGalones)} icon={<Droplet className="h-4 w-4" />} color="blue" />
      </div>

      {/* Product breakdown */}
      {productSales.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Galonaje por combustible</h3>
          <div className="space-y-2">
            {productSales.map((p) => (
              <div key={p.nombre} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                <span className="text-sm text-slate-700 flex-1">{p.nombre}</span>
                <span className="text-sm font-bold text-slate-900">{p.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal</span>
                {data.galones > 0 && <span className="text-xs text-slate-400">{((p.galones / data.galones) * 100).toFixed(1)}%</span>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// Type helper for DiagnosticoSection
function useDiagnostico() { return null as unknown as ReturnType<typeof useMemo<{ hayDatos: boolean; puntajeGeneral: number; saludFinanciera: number; estadoVentas: number; estadoInventario: number; ventas: number; galones: number; ingresos: number; gastos: number; utilidad: number; ventasChange: number | null; cuadrePct: number | null; cuadresCorrectos: number; cuadresConDiferencia: number; faltantesTotal: number; sobrantesTotal: number; inventarioGalones: number; tanquesNormales: number; tanquesBajos: number; tanquesCriticos: number; carrotanquesGalones: number; carrotanquesCount: number; empleadosActivos: number; parqueaderoIngresos: number; parqueaderoVehiculos: number }> | null>; }

function HealthBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'emerald' | 'blue' | 'amber' }) {
  const c = { emerald: { text: 'text-emerald-600', bg: 'bg-emerald-500', light: 'bg-emerald-50' }, blue: { text: 'text-blue-600', bg: 'bg-blue-500', light: 'bg-blue-50' }, amber: { text: 'text-amber-600', bg: 'bg-amber-500', light: 'bg-amber-50' } }[color];
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', c.light, c.text)}>{icon}</div>
        <div className="flex-1"><p className="text-sm font-medium text-slate-700">{label}</p></div>
        <span className={cn('text-xl font-bold', c.text)}>{value}</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full transition-all duration-1000 ease-out', c.bg)} style={{ width: `${value}%` }} />
      </div>
    </Card>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const cm: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600', red: 'bg-red-50 text-red-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', cm[color])}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate">{label}</p>
          <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
        </div>
      </div>
    </Card>
  );
}

// ===== ALERTAS =====
function AlertasSection({ alertas }: { alertas: AlertaItem[] }) {
  if (alertas.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50"><CheckCircle2 className="h-8 w-8 text-emerald-500" /></div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">No hay alertas activas</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">No se detectaron problemas en el periodo actual.</p>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {alertas.map((a, i) => (
        <Card key={i} className="p-5 transition-shadow hover:shadow-soft-lg">
          <div className="flex items-start gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
              a.prioridad === 'critica' ? 'bg-red-50 text-red-600' :
              a.prioridad === 'alta' ? 'bg-orange-50 text-orange-600' :
              a.prioridad === 'media' ? 'bg-amber-50 text-amber-600' :
              'bg-blue-50 text-blue-600')}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={cn('text-[10px] font-bold uppercase',
                  a.prioridad === 'critica' ? 'text-red-600' :
                  a.prioridad === 'alta' ? 'text-orange-600' :
                  a.prioridad === 'media' ? 'text-amber-600' : 'text-blue-600')}>
                  {a.prioridad}
                </span>
                {a.estacionNombre && <span className="text-[10px] text-slate-400">{a.estacionNombre}</span>}
              </div>
              <p className="text-sm font-semibold text-slate-900">{a.titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.descripcion}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{a.modulo}</span>
                <span className="text-[10px] text-slate-400">{a.fecha}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ===== RECOMENDACIONES =====
function RecomendacionesSection({ recomendaciones }: { recomendaciones: { titulo: string; desc: string; icon: typeof Lightbulb; color: string; bg: string }[] }) {
  if (recomendaciones.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100"><Lightbulb className="h-8 w-8 text-slate-400" /></div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">No hay datos suficientes</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">Registra más datos en el módulo de Estaciones para obtener recomendaciones personalizadas.</p>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {recomendaciones.map((r, i) => (
        <Card key={i} className="p-5 transition-all hover:shadow-soft-lg">
          <div className="flex items-start gap-3">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', r.bg, r.color)}><r.icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{r.titulo}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{r.desc}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ===== CHAT =====
function ChatSection({ kpis, alertas, productSales, estacionNombre, period }: {
  kpis: KpiData | null;
  alertas: AlertaItem[];
  productSales: ProductSales[];
  estacionNombre: string;
  period: { start: string; end: string; label: string };
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping]);

  const buildContext = useCallback(() => {
    const contextParts: string[] = [
      `Eres un consultor empresarial experto en estaciones de servicio. Responde en español, de forma clara y profesional.`,
      `NO inventes datos. Utiliza ÚNICAMENTE los datos que se te proporcionan a continuación.`,
      `Si no tienes información suficiente para responder, di "No tengo suficiente información para responder eso".`,
      `Contexto: Estación: ${estacionNombre}`,
      `Periodo: ${period.start} a ${period.end}`,
    ];

    if (kpis) {
      contextParts.push(`\nDATOS REALES DEL NEGOCIO:`);
      contextParts.push(`- Ventas del periodo: ${fmtCOP(kpis.ventas)}`);
      contextParts.push(`- Galones vendidos: ${kpis.galones.toLocaleString('es-CO')} gal`);
      contextParts.push(`- Ingresos: ${fmtCOP(kpis.ingresos)}`);
      contextParts.push(`- Gastos: ${fmtCOP(kpis.gastos)}`);
      contextParts.push(`- Utilidad: ${fmtCOP(kpis.utilidad)}`);

      if (kpis.prevVentas > 0) {
        const change = ((kpis.ventas - kpis.prevVentas) / kpis.prevVentas) * 100;
        contextParts.push(`- Ventas periodo anterior: ${fmtCOP(kpis.prevVentas)} (cambio: ${change.toFixed(1)}%)`);
      }
      if (kpis.prevGalones > 0) {
        const change = ((kpis.galones - kpis.prevGalones) / kpis.prevGalones) * 100;
        contextParts.push(`- Galones periodo anterior: ${kpis.prevGalones.toLocaleString('es-CO')} gal (cambio: ${change.toFixed(1)}%)`);
      }

      contextParts.push(`- Inventario actual: ${kpis.inventarioGalones.toLocaleString('es-CO')} gal`);
      contextParts.push(`- Tanques normales: ${kpis.tanquesNormales}`);
      contextParts.push(`- Tanques bajos: ${kpis.tanquesBajos}`);
      contextParts.push(`- Tanques críticos: ${kpis.tanquesCriticos}`);

      const totalCuadres = kpis.cuadresCorrectos + kpis.cuadresConDiferencia;
      if (totalCuadres > 0) {
        const pct = Math.round((kpis.cuadresCorrectos / totalCuadres) * 100);
        contextParts.push(`- Cuadres: ${kpis.cuadresCorrectos} correctos, ${kpis.cuadresConDiferencia} con diferencias (${pct}%)`);
        contextParts.push(`- Faltantes acumulados: ${fmtCOP(kpis.faltantesTotal)}`);
        contextParts.push(`- Sobrantes acumulados: ${fmtCOP(kpis.sobrantesTotal)}`);
      } else {
        contextParts.push(`- Cuadres: No hay datos de cuadres para este periodo.`);
      }

      contextParts.push(`- Carrotanques recibidos: ${kpis.carrotanquesCount} (${kpis.carrotanquesGalones.toLocaleString('es-CO')} gal)`);
      contextParts.push(`- Empleados activos: ${kpis.empleadosActivos}`);
      contextParts.push(`- Parqueadero: ${kpis.parqueaderoVehiculos} vehículos, ingresos ${fmtCOP(kpis.parqueaderoIngresos)}`);
    } else {
      contextParts.push(`\nNo hay datos disponibles para este periodo.`);
    }

    if (productSales.length > 0) {
      contextParts.push(`\nGALONAJE POR COMBUSTIBLE:`);
      productSales.forEach((p) => {
        const pct = kpis && kpis.galones > 0 ? ((p.galones / kpis.galones) * 100).toFixed(1) : '0';
        contextParts.push(`- ${p.nombre}: ${p.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal (${pct}%)`);
      });
    } else {
      contextParts.push(`\nGALONAJE POR COMBUSTIBLE: No hay datos suficientes.`);
    }

    if (alertas.length > 0) {
      contextParts.push(`\nALERTAS ACTIVAS (${alertas.length}):`);
      alertas.slice(0, 10).forEach((a) => {
        contextParts.push(`- [${a.prioridad.toUpperCase()}] ${a.titulo}: ${a.descripcion}`);
      });
    } else {
      contextParts.push(`\nALERTAS ACTIVAS: No hay alertas activas.`);
    }

    contextParts.push(`\nREGLAS:`);
    contextParts.push(`1. Todos los datos de combustible están en GALONES, no litros.`);
    contextParts.push(`2. No confundas ventas con utilidad. Ventas = dinero generado. Utilidad = ingresos - gastos.`);
    contextParts.push(`3. Si el usuario pregunta por una estación diferente a "${estacionNombre}" y no tienes datos de esa estación, responde: "No tienes permisos para consultar esa estación."`);
    contextParts.push(`4. Basa todas tus respuestas en los datos proporcionados arriba. No inventes números.`);

    return contextParts.join('\n');
  }, [kpis, alertas, productSales, estacionNombre, period]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsTyping(true);

    if (!apiKey) {
      setMessages((prev) => [...prev, { role: 'error', content: 'El análisis inteligente no está disponible en este momento. La API Key de Gemini no está configurada.' }]);
      setIsTyping(false);
      return;
    }

    try {
      const context = buildContext();
      const fullPrompt = `${context}\n\nPregunta del usuario: ${text}`;
      const response = await callGemini(apiKey, fullPrompt);
      setMessages((prev) => [...prev, { role: 'ai', content: response }]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[CentroInteligente] Error:', errorMsg);
      setMessages((prev) => [...prev, { role: 'error', content: 'El análisis inteligente no está disponible en este momento. Los datos del dashboard continúan funcionando normalmente.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedPrompts = [
    '¿Cómo están las ventas?',
    '¿Cuántos galones vendimos?',
    '¿Qué combustible se vende más?',
    '¿Qué debería revisar hoy?',
    '¿Cuáles son los mayores faltantes?',
  ];

  return (
    <Card className="flex flex-col overflow-hidden p-0" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
      {/* Context bar */}
      <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 flex items-center gap-2 text-xs text-slate-500">
        <Building2 className="h-3.5 w-3.5 text-slate-400" />
        <span className="font-semibold">{estacionNombre}</span>
        <span className="text-slate-300">·</span>
        <Calendar className="h-3.5 w-3.5 text-slate-400" />
        <span>{period.start} → {period.end}</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-6 overflow-y-auto bg-slate-50/40 p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
              <Bot className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-700">Consultar IA</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Pregúntame sobre {estacionNombre}. Tengo acceso a tus datos reales de galonaje, ventas, inventario, cuadres y alertas.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {suggestedPrompts.map((p) => (
                <button key={p} onClick={() => sendMessage(p)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary">{p}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === 'error') {
            return (
              <div key={i} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="max-w-[85%] rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-700">
                  {msg.content}
                </div>
              </div>
            );
          }
          return (
            <div key={i} className={cn('flex gap-3', msg.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft')}>
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              </div>
              <div className={cn('max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed', msg.role === 'user' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 shadow-soft')}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-soft">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
            </div>
          </div>
        )}
      </div>
      <div className="border-t border-slate-100 p-4">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Pregunta sobre ${estacionNombre}...`}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button type="submit" disabled={!input.trim() || isTyping} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-soft transition-all hover:bg-blue-600 disabled:opacity-50" aria-label="Enviar">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </Card>
  );
}
