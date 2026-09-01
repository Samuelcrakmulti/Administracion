'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Brain, Activity, AlertTriangle, Lightbulb, MessageSquare, Send, User,
  Sparkles, Loader2, Bot, CheckCircle2, Building2, Fuel, Droplet,
  TrendingUp, TrendingDown, ShieldAlert, Car, Truck, Users, Calendar,
  FileText, Clock, ChevronRight, BarChart3, History, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { callGemini } from '@/lib/gemini';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import {
  getPeriod, fetchKpis, fetchAlertas, fetchProductSales,
  fetchEstacionRanking, fetchDailyData,
  type PeriodKey, type Period, type KpiData, type AlertaItem, type ProductSales,
  type EstacionRanking, type DailyData,
} from '@/lib/centro-control';

type Estacion = { id: string; nombre: string };
type Message = { role: 'user' | 'ai' | 'error'; content: string };
type TabKey = 'diagnostico' | 'alertas' | 'recomendaciones' | 'chat' | 'ejecutivo' | 'historial';

const tabs: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: 'diagnostico', label: 'Diagnóstico', icon: Activity },
  { key: 'alertas', label: 'Alertas', icon: AlertTriangle },
  { key: 'recomendaciones', label: 'Recomendaciones', icon: Lightbulb },
  { key: 'chat', label: 'Consultar IA', icon: MessageSquare },
  { key: 'ejecutivo', label: 'Informe Ejecutivo', icon: FileText },
  { key: 'historial', label: 'Historial', icon: History },
];

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'esta_semana', label: 'Esta semana' },
  { key: 'este_mes', label: 'Este mes' },
  { key: 'mes_anterior', label: 'Mes anterior' },
  { key: 'este_anio', label: 'Este año' },
];

function fmtCOP(n: number): string {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtGal(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' gal';
}

type ConsultaHistorial = {
  id: string;
  pregunta: string;
  respuesta: string | null;
  periodo: string | null;
  estacion_id: string | null;
  created_at: string;
};

export default function CentroInteligentePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('diagnostico');
  const [loading, setLoading] = useState(true);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [selectedEstacion, setSelectedEstacion] = useState<string>('all');
  const [periodKey, setPeriodKey] = useState<PeriodKey>('este_mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [alertas, setAlertas] = useState<AlertaItem[]>([]);
  const [productSales, setProductSales] = useState<ProductSales[]>([]);
  const [ranking, setRanking] = useState<EstacionRanking[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [selectedAlerta, setSelectedAlerta] = useState<AlertaItem | null>(null);
  const [consultas, setConsultas] = useState<ConsultaHistorial[]>([]);

  const period = useMemo(() => {
    if (periodKey === 'personalizado' && customStart && customEnd) {
      return getPeriod('personalizado', customStart, customEnd);
    }
    return getPeriod(periodKey);
  }, [periodKey, customStart, customEnd]);

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

      if (!estacionId) {
        const r = await fetchEstacionRanking(period);
        setRanking(r);
      } else {
        setRanking([]);
      }

      const dd = await fetchDailyData(estacionId, period);
      setDailyData(dd);
    } catch (err) {
      console.error('[CentroInteligente] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [estacionId, period]);

  const fetchConsultas = useCallback(async () => {
    const { data } = await supabase
      .from('est_consultas_ia')
      .select('id, pregunta, respuesta, periodo, estacion_id, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setConsultas((data as ConsultaHistorial[]) ?? []);
  }, []);

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

  useEffect(() => {
    if (user) fetchConsultas();
  }, [user, fetchConsultas]);

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
          <p className="text-sm text-slate-500">Analiza tu empresa con inteligencia artificial.</p>
        </div>
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

      {/* Period filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-400" />
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriodKey(p.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
              periodKey === p.key
                ? 'bg-primary text-white shadow-soft'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-2">
          <Input
            type="date"
            value={customStart}
            onChange={(e) => { setCustomStart(e.target.value); setPeriodKey('personalizado'); }}
            className="h-8 w-36 text-xs"
          />
          <span className="text-xs text-slate-400">→</span>
          <Input
            type="date"
            value={customEnd}
            onChange={(e) => { setCustomEnd(e.target.value); setPeriodKey('personalizado'); }}
            className="h-8 w-36 text-xs"
          />
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
          {activeTab === 'diagnostico' && diagnostico && <DiagnosticoSection data={diagnostico} estacionNombre={estacionNombre} productSales={productSales} period={period} />}
          {activeTab === 'alertas' && <AlertasSection alertas={alertas} onSelectAlerta={setSelectedAlerta} />}
          {activeTab === 'recomendaciones' && <RecomendacionesSection recomendaciones={recomendaciones} />}
          {activeTab === 'chat' && (
            <ChatSection
              kpis={kpis}
              alertas={alertas}
              productSales={productSales}
              estacionNombre={estacionNombre}
              estacionId={estacionId}
              period={period}
              periodKey={periodKey}
              ranking={ranking}
              dailyData={dailyData}
              onConsultaSaved={fetchConsultas}
            />
          )}
          {activeTab === 'ejecutivo' && (
            <EjecutivoSection
              kpis={kpis}
              alertas={alertas}
              productSales={productSales}
              ranking={ranking}
              estacionNombre={estacionNombre}
              period={period}
            />
          )}
          {activeTab === 'historial' && (
            <HistorialSection consultas={consultas} estaciones={estaciones} onRefresh={fetchConsultas} />
          )}
        </>
      )}

      {/* Alert detail dialog */}
      <Dialog open={!!selectedAlerta} onOpenChange={(open) => { if (!open) setSelectedAlerta(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAlerta?.titulo}</DialogTitle>
            <DialogDescription>Detalle de la alerta detectada</DialogDescription>
          </DialogHeader>
          {selectedAlerta && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={cn(
                  'text-[10px]',
                  selectedAlerta.prioridad === 'critica' ? 'bg-red-100 text-red-700' :
                  selectedAlerta.prioridad === 'alta' ? 'bg-orange-100 text-orange-700' :
                  selectedAlerta.prioridad === 'media' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                )}>
                  {selectedAlerta.prioridad.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-[10px]">{selectedAlerta.modulo}</Badge>
                {selectedAlerta.estacionNombre && <Badge variant="outline" className="text-[10px]">{selectedAlerta.estacionNombre}</Badge>}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Qué ocurrió</p>
                  <p className="text-slate-700">{selectedAlerta.descripcion}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Fecha</p>
                  <p className="text-slate-700">{selectedAlerta.fecha}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Origen del dato</p>
                  <p className="text-slate-700">Detectado automáticamente desde el módulo de {selectedAlerta.modulo}.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Acción sugerida</p>
                  <p className="text-slate-700">
                    {selectedAlerta.tipo === 'inventario_critico' && 'Revisar el tanque y programar un carrotanque de abastecimiento inmediatamente.'}
                    {selectedAlerta.tipo === 'inventario_bajo' && 'Verificar niveles del tanque y planificar el próximo pedido de combustible.'}
                    {selectedAlerta.tipo === 'cuadre_faltante' && 'Revisar las lecturas del turno, los medios de pago y el cuadre de caja con el empleado responsable.'}
                    {selectedAlerta.tipo === 'cuadre_sobrante' && 'Verificar el origen del sobrante: posible error de digitación o vale no registrado.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {selectedAlerta.modulo === 'Inventario' && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => window.location.href = '/dashboard/estaciones'}>
                    <Fuel className="h-3.5 w-3.5" />Ver inventario
                  </Button>
                )}
                {selectedAlerta.modulo === 'Cuadres' && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => window.location.href = '/dashboard/estaciones'}>
                    <ShieldAlert className="h-3.5 w-3.5" />Ver cuadre
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5 text-xs ml-auto" onClick={() => setSelectedAlerta(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== DIAGNÓSTICO =====
type DiagnosticoData = {
  hayDatos: boolean;
  puntajeGeneral: number;
  saludFinanciera: number;
  estadoVentas: number;
  estadoInventario: number;
  ventas: number;
  galones: number;
  ingresos: number;
  gastos: number;
  utilidad: number;
  ventasChange: number | null;
  cuadrePct: number | null;
  cuadresCorrectos: number;
  cuadresConDiferencia: number;
  faltantesTotal: number;
  sobrantesTotal: number;
  inventarioGalones: number;
  tanquesNormales: number;
  tanquesBajos: number;
  tanquesCriticos: number;
  carrotanquesGalones: number;
  carrotanquesCount: number;
  empleadosActivos: number;
  parqueaderoIngresos: number;
  parqueaderoVehiculos: number;
};

function DiagnosticoSection({ data, estacionNombre, productSales, period }: {
  data: DiagnosticoData;
  estacionNombre: string;
  productSales: ProductSales[];
  period: Period;
}) {
  if (!data.hayDatos) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Activity className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">No hay datos suficientes</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          El sistema necesita más información para generar un diagnóstico de {estacionNombre} entre {period.start} y {period.end}.
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
              Periodo: {period.start} → {period.end}.{' '}
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

      {/* Comparison vs previous period */}
      {data.ventasChange !== null && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
          {data.ventasChange >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
          <p className="text-sm text-slate-600">
            Las ventas {data.ventasChange >= 0 ? 'aumentaron' : 'disminuyeron'}{' '}
            <span className={cn('font-bold', data.ventasChange >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              {Math.abs(data.ventasChange).toFixed(1)}%
            </span>{' '}
            frente al periodo anterior.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <HealthBar label="Salud Financiera" value={data.saludFinanciera} icon={<TrendingUp className="h-5 w-5" />} color="emerald" />
        <HealthBar label="Estado de Ventas" value={data.estadoVentas} icon={<Activity className="h-5 w-5" />} color="blue" />
        <HealthBar label="Estado de Inventario" value={data.estadoInventario} icon={<Fuel className="h-5 w-5" />} color="amber" />
      </div>

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
function AlertasSection({ alertas, onSelectAlerta }: { alertas: AlertaItem[]; onSelectAlerta: (a: AlertaItem) => void }) {
  if (alertas.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50"><CheckCircle2 className="h-8 w-8 text-emerald-500" /></div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">No hay alertas activas</h3>
        <p className="mt-1 max-w-md text-sm text-slate-500">No se detectaron problemas en el periodo actual.</p>
      </Card>
    );
  }

  const prioCount: Record<string, number> = { critica: 0, alta: 0, media: 0, baja: 0 };
  alertas.forEach((a) => { prioCount[a.prioridad] = (prioCount[a.prioridad] || 0) + 1; });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: 'critica', label: 'Críticas', cls: 'bg-red-50 text-red-700', icon: AlertTriangle },
          { key: 'alta', label: 'Altas', cls: 'bg-orange-50 text-orange-700', icon: ShieldAlert },
          { key: 'media', label: 'Medias', cls: 'bg-amber-50 text-amber-700', icon: AlertTriangle },
          { key: 'baja', label: 'Informativas', cls: 'bg-blue-50 text-blue-700', icon: Activity },
        ].map((p) => (
          <Card key={p.key} className={cn('p-4 text-center', p.cls)}>
            <p.icon className="mx-auto h-5 w-5" />
            <p className="mt-2 text-2xl font-bold">{prioCount[p.key] || 0}</p>
            <p className="text-xs">{p.label}</p>
          </Card>
        ))}
      </div>

      {/* Alert list */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alertas.map((a, i) => (
          <Card key={i} className="cursor-pointer p-5 transition-all hover:shadow-soft-lg" onClick={() => onSelectAlerta(a)}>
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
                  <ChevronRight className="ml-auto h-3 w-3 text-slate-300" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
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
            <div className="min-w-0">
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
function ChatSection({
  kpis, alertas, productSales, estacionNombre, estacionId, period, periodKey, ranking, dailyData, onConsultaSaved,
}: {
  kpis: KpiData | null;
  alertas: AlertaItem[];
  productSales: ProductSales[];
  estacionNombre: string;
  estacionId: string | null;
  period: Period;
  periodKey: PeriodKey;
  ranking: EstacionRanking[];
  dailyData: DailyData[];
  onConsultaSaved: () => void;
}) {
  const { user } = useAuth();
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
      `Periodo: ${period.start} a ${period.end} (${period.label})`,
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
        contextParts.push(`- ${p.nombre}: ${p.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal (${pct}%) - Ventas: ${fmtCOP(p.ventas)}`);
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

    if (ranking.length > 1) {
      contextParts.push(`\nRANKING DE ESTACIONES (por ventas):`);
      ranking.forEach((r, i) => {
        contextParts.push(`${i + 1}. ${r.nombre} — ${fmtCOP(r.ventas)}, ${r.galones.toLocaleString('es-CO')} gal, ${r.diferencias} descuadre(s)`);
      });
    }

    if (dailyData.length > 0) {
      const recentDays = dailyData.slice(-7);
      const avgGalones = recentDays.reduce((s, d) => s + d.galones, 0) / recentDays.length;
      if (avgGalones > 0) {
        contextParts.push(`\nTENDENCIA (últimos 7 días con datos):`);
        contextParts.push(`- Consumo promedio diario: ${avgGalones.toFixed(0)} gal/día`);
        const totalInv = kpis?.inventarioGalones ?? 0;
        if (totalInv > 0 && avgGalones > 0) {
          const daysLeft = Math.floor(totalInv / avgGalones);
          contextParts.push(`- Estimación de inventario: ~${daysLeft} días con el consumo actual (esto es una estimación, no una certeza).`);
        }
      }
    }

    contextParts.push(`\nREGLAS:`);
    contextParts.push(`1. Todos los datos de combustible están en GALONES, no litros.`);
    contextParts.push(`2. No confundas ventas con utilidad. Ventas = dinero generado por combustible. Utilidad = ingresos - gastos.`);
    contextParts.push(`3. Si el usuario pregunta por una estación diferente a "${estacionNombre}" y no tienes datos de esa estación, responde: "No tienes permisos para consultar esa estación."`);
    contextParts.push(`4. Basa todas tus respuestas en los datos proporcionados arriba. No inventes números.`);
    contextParts.push(`5. Cuando menciones una diferencia o descuadre, usa lenguaje neutral. No acuses a empleados.`);
    contextParts.push(`6. Si puedes, explica cómo calculaste un resultado importante (ej: "galones = lectura final - lectura inicial").`);

    return contextParts.join('\n');
  }, [kpis, alertas, productSales, estacionNombre, period, ranking, dailyData]);

  const saveConsulta = async (pregunta: string, respuesta: string) => {
    try {
      await supabase.from('est_consultas_ia').insert({
        pregunta,
        respuesta,
        periodo: periodKey,
        estacion_id: estacionId,
      });
      onConsultaSaved();
    } catch (err) {
      console.error('[Chat] Error saving consulta:', err);
    }
  };

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
      saveConsulta(text, response);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[CentroInteligente] Error:', errorMsg);
      setMessages((prev) => [...prev, { role: 'error', content: 'El análisis inteligente no está disponible en este momento. Los datos del dashboard continúan funcionando normalmente.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestedPrompts = [
    '¿Cómo estuvieron las ventas?',
    '¿Cuántos galones vendimos?',
    '¿Cuál fue el combustible más vendido?',
    '¿Hay descuadres?',
    '¿Cómo está el inventario?',
    '¿Qué estación tuvo mejor desempeño?',
    '¿Hay alertas importantes?',
  ];

  return (
    <Card className="flex flex-col overflow-hidden p-0" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
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
            <h3 className="mt-4 text-base font-semibold text-slate-700">Pregúntale a NexoPyme AI</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Tengo acceso a tus datos reales de galonaje, ventas, inventario, cuadres y alertas de {estacionNombre}.
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
            placeholder={`Pregúntale a NexoPyme AI sobre ${estacionNombre}...`}
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

// ===== INFORME EJECUTIVO =====
function EjecutivoSection({
  kpis, alertas, productSales, ranking, estacionNombre, period,
}: {
  kpis: KpiData | null;
  alertas: AlertaItem[];
  productSales: ProductSales[];
  ranking: EstacionRanking[];
  estacionNombre: string;
  period: Period;
}) {
  if (!kpis) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-slate-300" />
        <p className="mt-4 text-sm text-slate-500">No hay datos para generar el informe ejecutivo.</p>
      </Card>
    );
  }

  const ventasChange = kpis.prevVentas > 0 ? ((kpis.ventas - kpis.prevVentas) / kpis.prevVentas) * 100 : null;
  const galonesChange = kpis.prevGalones > 0 ? ((kpis.galones - kpis.prevGalones) / kpis.prevGalones) * 100 : null;
  const alertasCriticas = alertas.filter((a) => a.prioridad === 'critica').length;
  const alertasAltas = alertas.filter((a) => a.prioridad === 'alta').length;
  const topProduct = productSales[0];
  const topStation = ranking[0];

  return (
    <div className="space-y-5">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Informe Ejecutivo</h2>
            <p className="text-xs text-slate-500">{estacionNombre} — {period.start} a {period.end}</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed text-slate-700">
          Durante el periodo del <strong>{period.start}</strong> al <strong>{period.end}</strong>,{' '}
          {estacionNombre.toLowerCase()} registró ventas por <strong>{fmtCOP(kpis.ventas)}</strong> con un total de{' '}
          <strong>{kpis.galones.toLocaleString('es-CO')} galones</strong> vendidos.
          {ventasChange !== null && (
            <> Las ventas {ventasChange >= 0 ? 'aumentaron' : 'disminuyeron'} un <strong>{Math.abs(ventasChange).toFixed(1)}%</strong> frente al periodo anterior.</>
          )}
          {galonesChange !== null && (
            <> El galonaje {galonesChange >= 0 ? 'aumentó' : 'disminuyó'} un <strong>{Math.abs(galonesChange).toFixed(1)}%</strong>.</>
          )}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className={cn('p-5', kpis.utilidad >= 0 ? 'border-emerald-200' : 'border-red-200')}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={cn('h-4 w-4', kpis.utilidad >= 0 ? 'text-emerald-600' : 'text-red-600')} />
            <p className="text-xs font-semibold text-slate-500">Utilidad</p>
          </div>
          <p className={cn('text-2xl font-bold', kpis.utilidad >= 0 ? 'text-emerald-700' : 'text-red-700')}>{fmtCOP(kpis.utilidad)}</p>
          <p className="mt-1 text-xs text-slate-500">Ingresos: {fmtCOP(kpis.ingresos)} · Gastos: {fmtCOP(kpis.gastos)}</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Droplet className="h-4 w-4 text-blue-600" />
            <p className="text-xs font-semibold text-slate-500">Combustible más vendido</p>
          </div>
          {topProduct ? (
            <>
              <p className="text-2xl font-bold text-slate-900">{topProduct.nombre}</p>
              <p className="mt-1 text-xs text-slate-500">{topProduct.galones.toLocaleString('es-CO', { maximumFractionDigits: 2 })} gal — {fmtCOP(topProduct.ventas)}</p>
            </>
          ) : <p className="text-sm text-slate-400">Sin datos</p>}
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-semibold text-slate-500">Alertas</p>
          </div>
          <p className="text-2xl font-bold text-slate-900">{alertas.length}</p>
          <p className="mt-1 text-xs text-slate-500">{alertasCriticas} críticas · {alertasAltas} altas</p>
        </Card>
      </div>

      {/* Lo más importante */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Lo más importante</h3>
        <div className="space-y-2">
          {kpis.cuadresConDiferencia > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <p className="text-slate-700">Se detectaron <strong>{kpis.cuadresConDiferencia} turno(s)</strong> con diferencias. Faltantes: {fmtCOP(kpis.faltantesTotal)}.</p>
            </div>
          )}
          {kpis.tanquesCriticos > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
              <p className="text-slate-700"><strong>{kpis.tanquesCriticos} tanque(s)</strong> en nivel crítico requieren abastecimiento urgente.</p>
            </div>
          )}
          {kpis.tanquesBajos > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
              <p className="text-slate-700"><strong>{kpis.tanquesBajos} tanque(s)</strong> con nivel bajo. Programar abastecimiento.</p>
            </div>
          )}
          {ventasChange !== null && ventasChange < -10 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" />
              <p className="text-slate-700">Las ventas cayeron <strong>{Math.abs(ventasChange).toFixed(1)}%</strong> frente al periodo anterior.</p>
            </div>
          )}
          {ventasChange !== null && ventasChange > 10 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <p className="text-slate-700">Las ventas aumentaron <strong>{ventasChange.toFixed(1)}%</strong> frente al periodo anterior.</p>
            </div>
          )}
          {topProduct && kpis.galones > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
              <p className="text-slate-700">{topProduct.nombre} representa el <strong>{((topProduct.galones / kpis.galones) * 100).toFixed(0)}%</strong> del galonaje vendido.</p>
            </div>
          )}
          {ranking.length > 1 && topStation && (
            <div className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-500" />
              <p className="text-slate-700">{topStation.nombre} es la estación con mayor ventas: {fmtCOP(topStation.ventas)}.</p>
            </div>
          )}
          {kpis.cuadresConDiferencia === 0 && kpis.tanquesCriticos === 0 && kpis.tanquesBajos === 0 && (ventasChange === null || (ventasChange >= -10 && ventasChange <= 10)) && (
            <div className="flex items-start gap-2 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              <p className="text-slate-700">No se detectan problemas críticos. La operación se desarrolla normalmente.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Station ranking */}
      {ranking.length > 1 && (
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Ranking de estaciones</h3>
          <div className="space-y-2">
            {ranking.map((r, i) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{i + 1}</span>
                <span className="text-sm font-semibold text-slate-800 flex-1">{r.nombre}</span>
                <span className="text-sm text-slate-600">{fmtCOP(r.ventas)}</span>
                <span className="text-xs text-slate-400">{r.galones.toLocaleString('es-CO')} gal</span>
                {r.diferencias > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px]">{r.diferencias} descuadre(s)</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ===== HISTORIAL =====
function HistorialSection({ consultas, estaciones, onRefresh }: {
  consultas: ConsultaHistorial[];
  estaciones: Estacion[];
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await supabase.from('est_consultas_ia').delete().eq('id', id);
    onRefresh();
    toast.success('Consulta eliminada.');
  };

  if (consultas.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <History className="h-10 w-10 text-slate-300" />
        <h3 className="mt-4 text-base font-semibold text-slate-700">No hay consultas guardadas</h3>
        <p className="mt-1 text-sm text-slate-500">Las preguntas que hagas al chat de IA se guardarán aquí.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {consultas.map((c) => {
        const estName = c.estacion_id ? estaciones.find((e) => e.id === c.estacion_id)?.nombre ?? 'Estación' : 'Toda la empresa';
        const isExpanded = expanded === c.id;
        return (
          <Card key={c.id} className="p-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{c.pregunta}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  {new Date(c.created_at).toLocaleString('es-CO')}
                  <span className="text-slate-300">·</span>
                  {estName}
                  {c.periodo && <><span className="text-slate-300">·</span><span>{c.periodo}</span></>}
                </div>
                {c.respuesta && (
                  <p className={cn('mt-2 text-xs leading-relaxed text-slate-600', !isExpanded && 'line-clamp-2')}>
                    {c.respuesta}
                  </p>
                )}
                {c.respuesta && c.respuesta.length > 120 && (
                  <button
                    onClick={() => setExpanded(isExpanded ? null : c.id)}
                    className="mt-1 text-[10px] font-medium text-primary hover:underline"
                  >
                    {isExpanded ? 'Ver menos' : 'Ver respuesta completa'}
                  </button>
                )}
              </div>
              <button onClick={() => handleDelete(c.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
