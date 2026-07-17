'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Car, ParkingSquare, DollarSign, TrendingUp, Clock, BarChart2,
  Plus, Loader2, LogOut, AlertTriangle, RefreshCw, Settings,
  History, Activity, Building2, MapPin, ChevronRight, ArrowLeft,
  Bike, Accessibility, Users as UsersIcon, Star,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ParqIngresoModal } from '@/components/dashboard/parqueadero/parq-ingreso-modal';
import { ParqSalidaModal } from '@/components/dashboard/parqueadero/parq-salida-modal';
import { ParqHistorial } from '@/components/dashboard/parqueadero/parq-historial';
import { ParqEstadisticas } from '@/components/dashboard/parqueadero/parq-estadisticas';
import { ParqConfiguracion } from '@/components/dashboard/parqueadero/parq-configuracion';

type Estacion = {
  id: string; nombre: string; empresa: string | null; ciudad: string | null;
  direccion: string | null; telefono: string | null; estado: string;
};

type Registro = {
  id: string; placa: string; tipo_vehiculo: string; nombre_conductor: string | null;
  documento: string | null; telefono: string | null; espacio: string | null;
  marca: string | null; color: string | null; responsable: string | null;
  observaciones: string | null; hora_ingreso: string; hora_salida: string | null;
  tiempo_minutos: number | null; subtotal: number | null; descuento: number | null;
  iva: number | null; total: number | null; metodo_pago: string | null;
  estado: string; estacion_id: string | null; created_at: string;
};
type Config = {
  id?: string; total_cupos: number; tiempo_gracia_min: number;
  iva_pct: number; horario_apertura: string; horario_cierre: string;
  cupos_carros: number; cupos_motos: number; cupos_especiales: number;
  cupos_discapacitados: number; cupos_empleados: number;
};
type Tarifa = {
  id?: string; tipo_vehiculo: string; tarifa_primera_hora: number;
  tarifa_hora_adicional: number; tarifa_maxima_dia: number;
};

const TIPOS_LABEL: Record<string, string> = {
  automovil: 'Automóvil', motocicleta: 'Motocicleta', bicicleta: 'Bicicleta',
  camioneta: 'Camioneta', camion: 'Camión',
};

type TabKey = 'dashboard' | 'historial' | 'estadisticas' | 'configuracion';
const TABS: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Activity },
  { key: 'historial', label: 'Historial', icon: History },
  { key: 'estadisticas', label: 'Estadísticas', icon: BarChart2 },
  { key: 'configuracion', label: 'Configuración', icon: Settings },
];

const DEFAULT_CONFIG: Config = {
  total_cupos: 50, tiempo_gracia_min: 15, iva_pct: 0,
  horario_apertura: '06:00', horario_cierre: '22:00',
  cupos_carros: 30, cupos_motos: 10, cupos_especiales: 5,
  cupos_discapacitados: 3, cupos_empleados: 2,
};

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function minutosDesde(ts: string) {
  return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
}

function formatTiempo(min: number) {
  const h = Math.floor(min / 60); const m = min % 60;
  if (h > 0) return `${h}h ${m}m`; return `${m}m`;
}

export default function ParqueaderoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [selectedEstacion, setSelectedEstacion] = useState<Estacion | null>(null);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [stationStats, setStationStats] = useState<Record<string, { activos: number; totalCupos: number }>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [showIngreso, setShowIngreso] = useState(false);
  const [salidaRegistro, setSalidaRegistro] = useState<Registro | null>(null);
  const [, setNowTick] = useState(Date.now());

  // Refresh elapsed time every 30s
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Fetch estaciones
  const fetchEstaciones = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('estaciones').select('*').order('nombre');
    if (error) { toast.error('Error al cargar estaciones'); setLoading(false); return; }
    setEstaciones((data as Estacion[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchEstaciones(); }, [user, fetchEstaciones]);

  // Fetch station stats for selection screen
  const fetchStationStats = useCallback(async (estIds: string[]) => {
    if (estIds.length === 0) return;
    const [regRes, cfgRes] = await Promise.all([
      supabase.from('parqueadero_registros').select('estacion_id, estado').in('estacion_id', estIds).eq('estado', 'activo'),
      supabase.from('parqueadero_config').select('estacion_id, total_cupos').in('estacion_id', estIds),
    ]);
    const stats: Record<string, { activos: number; totalCupos: number }> = {};
    estIds.forEach((id) => { stats[id] = { activos: 0, totalCupos: 50 }; });
    (regRes.data ?? []).forEach((r: any) => {
      if (r.estacion_id) stats[r.estacion_id].activos = (stats[r.estacion_id]?.activos ?? 0) + 1;
    });
    (cfgRes.data ?? []).forEach((c: any) => {
      if (c.estacion_id) stats[c.estacion_id].totalCupos = c.total_cupos;
    });
    setStationStats(stats);
  }, []);

  useEffect(() => {
    if (estaciones.length > 0 && !selectedEstacion) {
      fetchStationStats(estaciones.map((e) => e.id));
    }
  }, [estaciones, selectedEstacion, fetchStationStats]);

  // Fetch station-scoped data
  const fetchStationData = useCallback(async (estacionId: string) => {
    setLoading(true);
    try {
      const [regRes, cfgRes, tarRes] = await Promise.all([
        supabase.from('parqueadero_registros').select('*').eq('estacion_id', estacionId).order('hora_ingreso', { ascending: false }),
        supabase.from('parqueadero_config').select('*').eq('estacion_id', estacionId).maybeSingle(),
        supabase.from('parqueadero_tarifas').select('*').eq('estacion_id', estacionId),
      ]);
      setRegistros((regRes.data as Registro[]) ?? []);
      if (cfgRes.data) setConfig(cfgRes.data as Config); else setConfig(DEFAULT_CONFIG);
      setTarifas((tarRes.data as Tarifa[]) ?? []);
    } catch (err) {
      console.error('[Parqueadero] fetchStationData', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectEstacion = (est: Estacion) => {
    setSelectedEstacion(est);
    setActiveTab('dashboard');
    fetchStationData(est.id);
  };

  const handleCambiarEstacion = () => {
    setSelectedEstacion(null);
    setRegistros([]);
    setConfig(DEFAULT_CONFIG);
    setTarifas([]);
    fetchEstaciones();
  };

  const handleRefresh = useCallback(async () => {
    if (selectedEstacion) await fetchStationData(selectedEstacion.id);
    else await fetchEstaciones();
  }, [selectedEstacion, fetchStationData, fetchEstaciones]);

  const activos = useMemo(() => registros.filter((r) => r.estado === 'activo'), [registros]);

  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now2 = new Date();
    const ingresosDia = registros.filter((r) => r.estado === 'pagado' && r.hora_salida?.startsWith(todayStr)).reduce((s, r) => s + (r.total ?? 0), 0);
    const ingresosMes = registros.filter((r) => {
      if (r.estado !== 'pagado' || !r.hora_salida) return false;
      const d = new Date(r.hora_salida);
      return d.getMonth() === now2.getMonth() && d.getFullYear() === now2.getFullYear();
    }).reduce((s, r) => s + (r.total ?? 0), 0);
    const conTiempo = registros.filter((r) => r.estado === 'pagado' && r.tiempo_minutos);
    const avgMin = conTiempo.length > 0 ? Math.round(conTiempo.reduce((s, r) => s + (r.tiempo_minutos ?? 0), 0) / conTiempo.length) : 0;
    const cuposOcupados = activos.length;
    const cuposLibres = Math.max(0, config.total_cupos - cuposOcupados);
    const ocupacion = config.total_cupos > 0 ? Math.min(100, Math.round((cuposOcupados / config.total_cupos) * 100)) : 0;
    return { cuposOcupados, cuposLibres, ingresosDia, ingresosMes, avgMin, ocupacion };
  }, [registros, activos, config.total_cupos]);

  // Alerts
  const alertas = useMemo(() => {
    const alerts: { tipo: string; mensaje: string; severity: 'red' | 'amber' | 'blue' }[] = [];
    if (kpis.ocupacion >= 100) alerts.push({ tipo: 'lleno', mensaje: 'Parqueadero lleno — no hay espacios disponibles', severity: 'red' });
    else if (kpis.ocupacion >= 80) alerts.push({ tipo: 'critico', mensaje: `Ocupación crítica (${kpis.ocupacion}%) — pocos espacios disponibles`, severity: 'amber' });
    activos.forEach((r) => {
      const min = minutosDesde(r.hora_ingreso);
      if (min > 1440) alerts.push({ tipo: 'permanencia', mensaje: `Vehículo ${r.placa} con permanencia superior a 24h (${formatTiempo(min)})`, severity: 'amber' });
    });
    return alerts;
  }, [kpis.ocupacion, activos]);

  const handleAnular = async (id: string) => {
    if (!confirm('¿Anular este registro? El vehículo se retirará sin cobro.')) return;
    const { error } = await supabase.from('parqueadero_registros').update({ estado: 'anulado', hora_salida: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Error al anular.'); return; }
    toast.success('Registro anulado.');
    if (selectedEstacion) fetchStationData(selectedEstacion.id);
  };

  // ─── STATION SELECTION SCREEN ──────────────────────────────────────────────
  if (!selectedEstacion) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-soft">
              <ParkingSquare className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parqueadero Inteligente</h1>
              <p className="text-sm text-slate-500">Selecciona la estación de servicio a administrar</p>
            </div>
          </div>
          <Button onClick={fetchEstaciones} variant="outline" className="gap-2" size="sm">
            <RefreshCw className="h-4 w-4" />Actualizar
          </Button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : estaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-soft">
              <ParkingSquare className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-700">No hay estaciones registradas</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-400">Primero crea estaciones de servicio en el módulo de Estaciones para administrar sus parqueaderos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {estaciones.map((est) => {
              const stats = stationStats[est.id] ?? { activos: 0, totalCupos: 50 };
              const libres = Math.max(0, stats.totalCupos - stats.activos);
              const ocupacionPct = stats.totalCupos > 0 ? Math.min(100, Math.round((stats.activos / stats.totalCupos) * 100)) : 0;
              return (
                <Card key={est.id} className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-blue-700" />
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{est.nombre}</h3>
                          <p className="text-xs text-slate-400">{est.empresa || 'NexoPyme'}</p>
                        </div>
                      </div>
                      <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold', est.estado === 'activa' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        {est.estado === 'activa' ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-500">
                      {est.direccion && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" />{est.direccion}</p>}
                      {est.ciudad && <p className="flex items-center gap-2 text-slate-400"><span className="ml-5">{est.ciudad}</span></p>}
                    </div>

                    {/* Ocupación bar */}
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Ocupación</span>
                        <span className={cn('font-semibold', ocupacionPct >= 80 ? 'text-red-600' : ocupacionPct >= 60 ? 'text-amber-600' : 'text-emerald-600')}>{ocupacionPct}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full transition-all', ocupacionPct >= 80 ? 'bg-red-500' : ocupacionPct >= 60 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${ocupacionPct}%` }} />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{stats.activos}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Parqueados</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{libres}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Disponibles</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{stats.totalCupos}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Capacidad</p>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleSelectEstacion(est)}
                      className="mt-5 w-full gap-2"
                      disabled={est.estado !== 'activa'}
                    >
                      Administrar <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ─── STATION-SCOPED VIEW ─────────────────────────────────────────────────────
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-soft">
            <ParkingSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parqueadero Inteligente</h1>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{selectedEstacion.nombre}</span>
              {selectedEstacion.ciudad ? ` · ${selectedEstacion.ciudad}` : ''}
              {' · '}{activos.length} vehículos · {kpis.cuposLibres} disponibles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowIngreso(true)} className="gap-2 shadow-soft" size="sm">
            <Plus className="h-4 w-4" />Registrar ingreso
          </Button>
          <Button onClick={handleCambiarEstacion} variant="outline" className="gap-2" size="sm">
            <ArrowLeft className="h-4 w-4" />Cambiar Estación
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alertas.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertas.map((a, i) => (
            <div key={i} className={cn('flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm',
              a.severity === 'red' ? 'border-red-200 bg-red-50 text-red-700' : a.severity === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-200 bg-blue-50 text-blue-700')}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{a.mensaje}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-1.5 pb-1">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn('inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.key ? 'bg-primary text-white shadow-soft' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
              <tab.icon className="h-4 w-4" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* ====== DASHBOARD TAB ====== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="Vehículos estacionados" value={String(activos.length)} icon={<Car className="h-5 w-5" />} color="blue" />
                <KpiCard label="Cupos disponibles" value={String(kpis.cuposLibres)} icon={<ParkingSquare className="h-5 w-5" />} color={kpis.cuposLibres > 5 ? 'emerald' : 'amber'} />
                <KpiCard label="Ingresos del día" value={fmt(kpis.ingresosDia)} icon={<DollarSign className="h-5 w-5" />} color="teal" />
                <KpiCard label="Ingresos del mes" value={fmt(kpis.ingresosMes)} icon={<TrendingUp className="h-5 w-5" />} color="violet" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <KpiCard label="Tiempo promedio permanencia" value={kpis.avgMin > 0 ? formatTiempo(kpis.avgMin) : '—'} icon={<Clock className="h-5 w-5" />} color="slate" />
                <Card className="col-span-1 p-5 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Ocupación del parqueadero</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{kpis.ocupacion}%</p>
                      <p className="text-xs text-slate-400">{activos.length} / {config.total_cupos} cupos</p>
                    </div>
                    <div className="relative h-16 w-16">
                      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(214 32% 91%)" strokeWidth="6" />
                        <circle cx="32" cy="32" r="28" fill="none"
                          stroke={kpis.ocupacion > 80 ? '#ef4444' : kpis.ocupacion > 60 ? '#f59e0b' : '#22c55e'}
                          strokeWidth="6" strokeLinecap="round"
                          strokeDasharray={`${(kpis.ocupacion / 100) * 176} 176`}
                          className="transition-all duration-700" />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-slate-900">{kpis.ocupacion}%</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Space distribution */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <SpaceCard icon={<Car className="h-4 w-4" />} label="Carros" value={config.cupos_carros} color="bg-blue-50 text-blue-600" />
                <SpaceCard icon={<Bike className="h-4 w-4" />} label="Motos" value={config.cupos_motos} color="bg-emerald-50 text-emerald-600" />
                <SpaceCard icon={<Star className="h-4 w-4" />} label="Especiales" value={config.cupos_especiales} color="bg-amber-50 text-amber-600" />
                <SpaceCard icon={<Accessibility className="h-4 w-4" />} label="Discapacitados" value={config.cupos_discapacitados} color="bg-violet-50 text-violet-600" />
                <SpaceCard icon={<UsersIcon className="h-4 w-4" />} label="Empleados" value={config.cupos_empleados} color="bg-teal-50 text-teal-600" />
              </div>

              {/* Active vehicles */}
              {registros.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-soft">
                    <ParkingSquare className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-700">No hay vehículos registrados</h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-400">Comienza a registrar el ingreso de vehículos para ver el dashboard en tiempo real.</p>
                  <Button onClick={() => setShowIngreso(true)} className="mt-6 gap-2 shadow-soft">
                    <Plus className="h-4 w-4" />Registrar primer vehículo
                  </Button>
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Vehículos estacionados ahora ({activos.length})</h3>
                    <button onClick={handleRefresh} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  {activos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ParkingSquare className="h-10 w-10 text-slate-200" />
                      <p className="mt-3 text-sm text-slate-400">No hay vehículos actualmente estacionados.</p>
                      <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={() => setShowIngreso(true)}>
                        <Plus className="h-3.5 w-3.5" />Registrar ingreso
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            {['Placa', 'Tipo', 'Marca/Color', 'Ingreso', 'Tiempo', 'Espacio', 'Responsable', 'Estado', 'Acciones'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activos.map((r) => {
                            const min = minutosDesde(r.hora_ingreso);
                            return (
                              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-bold text-slate-900">{r.placa}</span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{TIPOS_LABEL[r.tipo_vehiculo] || r.tipo_vehiculo}</td>
                                <td className="px-4 py-3 text-sm text-slate-500">{[r.marca, r.color].filter(Boolean).join(' · ') || '—'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {new Date(r.hora_ingreso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span className={cn('text-sm font-semibold', min > 1440 ? 'text-red-600' : min > 120 ? 'text-amber-600' : 'text-slate-700')}>{formatTiempo(min)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{r.espacio || '—'}</td>
                                <td className="px-4 py-3 text-sm text-slate-500">{r.responsable || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Activo
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="default" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
                                      onClick={() => setSalidaRegistro(r)}>
                                      <LogOut className="h-3.5 w-3.5" />Salida
                                    </Button>
                                    <button onClick={() => handleAnular(r.id)}
                                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Anular">
                                      <AlertTriangle className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {activeTab === 'historial' && <ParqHistorial registros={registros} />}
          {activeTab === 'estadisticas' && <ParqEstadisticas registros={registros} totalCupos={config.total_cupos} />}
          {activeTab === 'configuracion' && (
            <ParqConfiguracion
              config={config.id ? config : null}
              tarifas={tarifas}
              estacionId={selectedEstacion.id}
              onSaved={handleRefresh}
            />
          )}
        </>
      )}

      {/* Modals */}
      <ParqIngresoModal open={showIngreso} estacionId={selectedEstacion?.id ?? null} onClose={() => setShowIngreso(false)} onSuccess={handleRefresh} />
      <ParqSalidaModal
        open={!!salidaRegistro}
        registro={salidaRegistro}
        tarifas={tarifas}
        config={{ tiempo_gracia_min: config.tiempo_gracia_min, iva_pct: config.iva_pct }}
        onClose={() => setSalidaRegistro(null)}
        onSuccess={handleRefresh}
      />
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const cm: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', teal: 'bg-teal-50 text-teal-600',
    violet: 'bg-violet-50 text-violet-600', slate: 'bg-slate-100 text-slate-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <Card className="p-5">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cm[color] || 'bg-slate-100 text-slate-600')}>{icon}</div>
      <p className="mt-4 text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}

function SpaceCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color)}>{icon}</div>
      <div>
        <p className="text-lg font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </Card>
  );
}
