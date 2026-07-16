'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Car, ParkingSquare, DollarSign, TrendingUp, Clock, BarChart2,
  Plus, Loader2, LogOut, AlertTriangle, RefreshCw, Settings,
  History, Activity,
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

type Registro = {
  id: string; placa: string; tipo_vehiculo: string; nombre_conductor: string | null;
  documento: string | null; telefono: string | null; espacio: string | null;
  observaciones: string | null; hora_ingreso: string; hora_salida: string | null;
  tiempo_minutos: number | null; subtotal: number | null; descuento: number | null;
  iva: number | null; total: number | null; metodo_pago: string | null;
  estado: string; created_at: string;
};
type Config = {
  id?: string; total_cupos: number; tiempo_gracia_min: number;
  iva_pct: number; horario_apertura: string; horario_cierre: string;
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

const DEFAULT_CONFIG: Config = { total_cupos: 50, tiempo_gracia_min: 15, iva_pct: 0, horario_apertura: '06:00', horario_cierre: '22:00' };

export default function ParqueaderoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [tarifas, setTarifas] = useState<Tarifa[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [showIngreso, setShowIngreso] = useState(false);
  const [salidaRegistro, setSalidaRegistro] = useState<Registro | null>(null);
  const [now, setNow] = useState(Date.now());

  // Refresh elapsed time every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: regs }, { data: cfg }, { data: tar }] = await Promise.all([
        supabase.from('parqueadero_registros').select('*').order('hora_ingreso', { ascending: false }),
        supabase.from('parqueadero_config').select('*').maybeSingle(),
        supabase.from('parqueadero_tarifas').select('*'),
      ]);
      setRegistros((regs as Registro[]) || []);
      if (cfg) setConfig(cfg as Config);
      setTarifas((tar as Tarifa[]) || []);
    } catch (err) {
      console.error('[Parqueadero] fetchAll error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (user) fetchAll(); }, [user, fetchAll]);

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

  const handleAnular = async (id: string) => {
    const { error } = await supabase.from('parqueadero_registros').update({ estado: 'anulado', hora_salida: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Error al anular.'); return; }
    toast.success('Vehículo anulado.');
    fetchAll();
  };

  const hayDatos = registros.length > 0;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-soft">
            <ParkingSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Parqueadero Inteligente</h1>
            <p className="text-sm text-slate-500">Control total de espacios, vehículos e ingresos</p>
          </div>
        </div>
        <Button onClick={() => setShowIngreso(true)} className="gap-2 shadow-soft" size="sm">
          <Plus className="h-4 w-4" />Registrar ingreso
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
              activeTab === tab.key ? 'bg-primary text-white shadow-soft' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
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

              {/* Empty state */}
              {!hayDatos ? (
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
                    <button onClick={fetchAll} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
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
                            {['Placa', 'Tipo', 'Hora ingreso', 'Tiempo', 'Espacio', 'Estado', 'Acciones'].map((h) => (
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
                                <td className="px-4 py-3 text-sm text-slate-600">
                                  {new Date(r.hora_ingreso).toLocaleTimeString('es-CO', { timeStyle: 'short' })}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                    <span className={cn('text-sm font-semibold', min > 120 ? 'text-amber-600' : 'text-slate-700')}>{formatTiempo(min)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-600">{r.espacio || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Activo
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Button size="sm" variant="default" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs"
                                      onClick={() => setSalidaRegistro(r)}>
                                      <LogOut className="h-3.5 w-3.5" />Registrar salida
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
          {activeTab === 'configuracion' && <ParqConfiguracion config={config.id ? config : null} tarifas={tarifas} onSaved={fetchAll} />}
        </>
      )}

      {/* Modals */}
      <ParqIngresoModal open={showIngreso} onClose={() => setShowIngreso(false)} onSuccess={fetchAll} />
      <ParqSalidaModal
        open={!!salidaRegistro}
        registro={salidaRegistro}
        tarifas={tarifas}
        config={{ tiempo_gracia_min: config.tiempo_gracia_min, iva_pct: config.iva_pct }}
        onClose={() => setSalidaRegistro(null)}
        onSuccess={fetchAll}
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
