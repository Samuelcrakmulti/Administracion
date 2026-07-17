'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Users, UserCheck, UserX, Palmtree, Clock, DollarSign,
  TrendingUp, Activity, Plus, Edit2, Trash2,
  Loader2, Calendar, BarChart2, Brain, Banknote, ChevronRight,
  RefreshCw, MapPin, Building2, Search, ArrowLeft, Fuel,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { EmpleadoModal } from '@/components/dashboard/talento/empleado-modal';
import { TurnosCalendario } from '@/components/dashboard/talento/turnos-calendario';
import { AsistenciaPanel } from '@/components/dashboard/talento/asistencia-panel';
import { NominaPanel } from '@/components/dashboard/talento/nomina-panel';
import { VacacionesPanel } from '@/components/dashboard/talento/vacaciones-panel';
import { TalentoEstadisticas } from '@/components/dashboard/talento/talento-estadisticas';
import { TalentoIA } from '@/components/dashboard/talento/talento-ia';

type Estacion = {
  id: string; nombre: string; empresa: string | null; ciudad: string | null;
  direccion: string | null; telefono: string | null; estado: string;
};

type Empleado = {
  id: string; nombre: string; apellido: string; cargo: string; documento: string | null;
  email: string | null; telefono: string | null; direccion: string | null;
  fecha_nacimiento: string | null; fecha_ingreso: string; tipo_contrato: string;
  salario: number; comision_pct: number; estado: string; eps: string | null;
  arl: string | null; banco: string | null; numero_cuenta: string | null;
  contacto_emergencia_nombre: string | null; contacto_emergencia_telefono: string | null;
  observaciones: string | null; estacion_id: string | null; created_at: string;
};
type Asistencia = { empleado_id: string; fecha: string; horas_trabajadas: number | null; estado: string };
type Nomina = { empleado_id: string; mes: number; anio: number; total: number; estado: string };

type TabKey = 'dashboard' | 'empleados' | 'turnos' | 'asistencia' | 'nomina' | 'vacaciones' | 'estadisticas' | 'ia';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Activity },
  { key: 'empleados', label: 'Empleados', icon: Users },
  { key: 'turnos', label: 'Turnos', icon: Calendar },
  { key: 'asistencia', label: 'Asistencia', icon: UserCheck },
  { key: 'nomina', label: 'Nómina', icon: Banknote },
  { key: 'vacaciones', label: 'Vacaciones', icon: Palmtree },
  { key: 'estadisticas', label: 'Estadísticas', icon: BarChart2 },
  { key: 'ia', label: 'Asistente IA', icon: Brain },
];

const ESTADO_CONFIG: Record<string, { label: string; color: string }> = {
  activo: { label: 'Activo', color: 'bg-emerald-50 text-emerald-700' },
  vacaciones: { label: 'Vacaciones', color: 'bg-blue-50 text-blue-700' },
  licencia: { label: 'Licencia', color: 'bg-amber-50 text-amber-700' },
  incapacidad: { label: 'Incapacidad', color: 'bg-orange-50 text-orange-700' },
  retirado: { label: 'Retirado', color: 'bg-slate-100 text-slate-500' },
};

const CONTRATO_LABELS: Record<string, string> = {
  indefinido: 'Indefinido', fijo: 'Término fijo', obra: 'Obra/labor',
  aprendizaje: 'Aprendizaje', prestacion: 'Prestación',
};

function fmt(v: number) { return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }); }

export default function TalentoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [selectedEstacion, setSelectedEstacion] = useState<Estacion | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [turnosHoy, setTurnosHoy] = useState<Record<string, number>>({});
  const [empCounts, setEmpCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [showModal, setShowModal] = useState(false);
  const [editEmpleado, setEditEmpleado] = useState<Empleado | null>(null);
  const [search, setSearch] = useState('');

  // Fetch estaciones
  const fetchEstaciones = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('estaciones').select('*').order('nombre');
    if (error) { toast.error('Error al cargar estaciones'); setLoading(false); return; }
    setEstaciones((data as Estacion[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchEstaciones(); }, [user, fetchEstaciones]);

  // Fetch station-scoped data
  const fetchStationData = useCallback(async (estacionId: string) => {
    setLoading(true);
    try {
      const [empRes, asisRes, nomRes, turRes] = await Promise.all([
        supabase.from('rrhh_empleados').select('*').eq('estacion_id', estacionId).order('nombre'),
        supabase.from('rrhh_asistencia').select('empleado_id, fecha, horas_trabajadas, estado').eq('estacion_id', estacionId).order('fecha', { ascending: false }).limit(500),
        supabase.from('rrhh_nomina').select('empleado_id, mes, anio, total, estado').eq('estacion_id', estacionId).order('anio', { ascending: false }),
        supabase.from('rrhh_turnos').select('estacion_id, fecha').eq('estacion_id', estacionId),
      ]);

      setEmpleados((empRes.data as Empleado[]) ?? []);
      setAsistencias((asisRes.data as Asistencia[]) ?? []);
      setNominas((nomRes.data as Nomina[]) ?? []);

      const hoy = new Date().toISOString().split('T')[0];
      const turnosCount: Record<string, number> = {};
      (turRes.data ?? []).forEach((t: any) => {
        if (t.fecha === hoy) {
          turnosCount[t.estacion_id] = (turnosCount[t.estacion_id] || 0) + 1;
        }
      });
      setTurnosHoy(turnosCount);
    } catch (err) { console.error('[Talento] fetchStationData', err); }
    finally { setLoading(false); }
  }, []);

  // Fetch turnos + employee counts for all stations (station selection screen)
  const fetchAllStationsStats = useCallback(async (estIds: string[]) => {
    if (estIds.length === 0) return;
    const hoy = new Date().toISOString().split('T')[0];
    const [turRes, empRes] = await Promise.all([
      supabase.from('rrhh_turnos').select('estacion_id, fecha').in('estacion_id', estIds).eq('fecha', hoy),
      supabase.from('rrhh_empleados').select('estacion_id').in('estacion_id', estIds).neq('estado', 'retirado'),
    ]);
    const tCounts: Record<string, number> = {};
    (turRes.data ?? []).forEach((t: any) => { tCounts[t.estacion_id] = (tCounts[t.estacion_id] || 0) + 1; });
    setTurnosHoy(tCounts);
    const eCounts: Record<string, number> = {};
    (empRes.data ?? []).forEach((e: any) => { if (e.estacion_id) eCounts[e.estacion_id] = (eCounts[e.estacion_id] || 0) + 1; });
    setEmpCounts(eCounts);
  }, []);

  useEffect(() => {
    if (estaciones.length > 0 && !selectedEstacion) {
      fetchAllStationsStats(estaciones.map((e) => e.id));
    }
  }, [estaciones, selectedEstacion, fetchAllStationsStats]);

  const handleSelectEstacion = (est: Estacion) => {
    setSelectedEstacion(est);
    setActiveTab('dashboard');
    fetchStationData(est.id);
  };

  const handleCambiarEstacion = () => {
    setSelectedEstacion(null);
    setEmpleados([]);
    setAsistencias([]);
    setNominas([]);
    fetchEstaciones();
  };

  const handleRefresh = useCallback(async () => {
    if (selectedEstacion) {
      await fetchStationData(selectedEstacion.id);
    } else {
      await fetchEstaciones();
    }
  }, [selectedEstacion, fetchStationData, fetchEstaciones]);

  const kpis = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0];
    const now = new Date();
    const activos = empleados.filter((e) => e.estado === 'activo').length;
    const enVacaciones = empleados.filter((e) => e.estado === 'vacaciones').length;
    const asistHoy = asistencias.filter((a) => a.fecha === hoy);
    const presentes = asistHoy.filter((a) => a.estado !== 'ausente').length;
    const ausentes = activos - presentes;
    const horasHoy = asistHoy.reduce((s, a) => s + (a.horas_trabajadas ?? 0), 0);
    const mesNom = nominas.filter((n) => n.mes === now.getMonth() + 1 && n.anio === now.getFullYear());
    const costoMes = mesNom.reduce((s, n) => s + n.total, 0);
    const last30 = asistencias.filter((a) => (now.getTime() - new Date(a.fecha + 'T00:00:00').getTime()) < 30 * 86400000);
    const asistRate = last30.length > 0 ? Math.round(last30.filter((a) => a.estado !== 'ausente').length / last30.length * 100) : 100;
    const turnosProgramados = turnosHoy[selectedEstacion?.id ?? ''] ?? 0;
    return { total: empleados.length, activos, presentes, ausentes, enVacaciones, horasHoy, costoMes, asistRate, turnosProgramados };
  }, [empleados, asistencias, nominas, turnosHoy, selectedEstacion]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este empleado? Esta acción no se puede deshacer.')) return;
    const { error } = await supabase.from('rrhh_empleados').update({ estado: 'retirado' }).eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    toast.success('Empleado marcado como retirado.');
    if (selectedEstacion) fetchStationData(selectedEstacion.id);
  };

  const openEdit = (emp: Empleado) => { setEditEmpleado(emp); setShowModal(true); };
  const openNew = () => { setEditEmpleado(null); setShowModal(true); };

  const empleadosFiltrados = useMemo(() => {
    if (!search.trim()) return empleados;
    const q = search.toLowerCase();
    return empleados.filter((e) =>
      `${e.nombre} ${e.apellido}`.toLowerCase().includes(q) ||
      e.cargo.toLowerCase().includes(q) ||
      (e.documento ?? '').toLowerCase().includes(q) ||
      (e.email ?? '').toLowerCase().includes(q)
    );
  }, [empleados, search]);

  // ─── STATION SELECTION SCREEN ──────────────────────────────────────────────
  if (!selectedEstacion) {
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-soft">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Talento Humano</h1>
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
              <Fuel className="h-10 w-10 text-slate-300" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-700">No hay estaciones registradas</h3>
            <p className="mt-2 max-w-sm text-sm text-slate-400">Primero crea estaciones de servicio en el módulo de Estaciones para administrar su talento humano.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {estaciones.map((est) => {
              const numEmps = empCounts[est.id] ?? 0;
              const numTurnos = turnosHoy[est.id] ?? 0;
              return (
                <Card key={est.id} className="group overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-600" />
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
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

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{numEmps}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Empleados</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-2xl font-bold text-slate-900">{numTurnos}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">Turnos hoy</p>
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
      {/* Header with station info + change button */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-soft">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Talento Humano</h1>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{selectedEstacion.nombre}</span>
              {selectedEstacion.ciudad ? ` · ${selectedEstacion.ciudad}` : ''}
              {' · '}{kpis.total} empleados · {kpis.turnosProgramados} turnos hoy
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openNew} className="gap-2 shadow-soft" size="sm">
            <Plus className="h-4 w-4" />Agregar empleado
          </Button>
          <Button onClick={handleCambiarEstacion} variant="outline" className="gap-2" size="sm">
            <ArrowLeft className="h-4 w-4" />Cambiar Estación
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
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
          {/* ── DASHBOARD ─────────────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="Total empleados" value={String(kpis.total)} icon={<Users className="h-5 w-5" />} color="blue" />
                <KpiCard label="Presentes hoy" value={String(kpis.presentes)} icon={<UserCheck className="h-5 w-5" />} color="emerald" />
                <KpiCard label="Ausentes hoy" value={String(kpis.ausentes)} icon={<UserX className="h-5 w-5" />} color={kpis.ausentes > 0 ? 'amber' : 'slate'} />
                <KpiCard label="En vacaciones" value={String(kpis.enVacaciones)} icon={<Palmtree className="h-5 w-5" />} color="teal" />
              </div>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <KpiCard label="Turnos programados hoy" value={String(kpis.turnosProgramados)} icon={<Calendar className="h-5 w-5" />} color="blue" />
                <KpiCard label="Horas trabajadas hoy" value={`${kpis.horasHoy.toFixed(1)}h`} icon={<Clock className="h-5 w-5" />} color="violet" />
                <KpiCard label="Costo nómina mes" value={fmt(kpis.costoMes)} icon={<DollarSign className="h-5 w-5" />} color="rose" small />
                <KpiCard label="Tasa de asistencia" value={`${kpis.asistRate}%`} icon={<TrendingUp className="h-5 w-5" />} color={kpis.asistRate >= 80 ? 'emerald' : 'amber'} />
              </div>

              {empleados.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-soft">
                    <Users className="h-10 w-10 text-slate-300" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-slate-700">No hay empleados en esta estación</h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-400">Comienza agregando el equipo de {selectedEstacion.nombre}.</p>
                  <Button onClick={openNew} className="mt-6 gap-2 shadow-soft"><Plus className="h-4 w-4" />Agregar primer empleado</Button>
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
                    <h3 className="text-sm font-semibold text-slate-900">Equipo de {selectedEstacion.nombre} ({empleados.length})</h3>
                    <button onClick={handleRefresh} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"><RefreshCw className="h-4 w-4" /></button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {['Empleado', 'Cargo', 'Contrato', 'Salario', 'Estado', 'Acciones'].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {empleados.slice(0, 8).map((emp) => {
                          const ec = ESTADO_CONFIG[emp.estado] ?? ESTADO_CONFIG.activo;
                          return (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-white">
                                    {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{emp.nombre} {emp.apellido}</p>
                                    <p className="text-xs text-slate-400">{emp.email || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">{emp.cargo}</td>
                              <td className="px-4 py-3">
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{CONTRATO_LABELS[emp.tipo_contrato] || emp.tipo_contrato}</span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmt(emp.salario)}</td>
                              <td className="px-4 py-3">
                                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ec.color)}>{ec.label}</span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => openEdit(emp)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Editar">
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button onClick={() => handleDelete(emp.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Retirar">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {empleados.length > 8 && (
                      <div className="border-t border-slate-100 px-4 py-3 text-center">
                        <button onClick={() => setActiveTab('empleados')} className="flex items-center gap-1 mx-auto text-xs font-medium text-primary hover:underline">
                          Ver todos los empleados ({empleados.length}) <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── EMPLEADOS ─────────────────────────────────────────── */}
          {activeTab === 'empleados' && (
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Empleados de {selectedEstacion.nombre} ({empleados.length})</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" className="h-8 w-44 pl-8 text-xs" />
                  </div>
                  <Button size="sm" onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" />Agregar</Button>
                </div>
              </div>
              {empleados.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-12 w-12 text-slate-200" />
                  <p className="mt-3 text-sm text-slate-500">No hay empleados registrados en esta estación.</p>
                  <Button size="sm" className="mt-4 gap-2" onClick={openNew}><Plus className="h-4 w-4" />Agregar primer empleado</Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {['Empleado', 'Cargo', 'Contrato', 'Ingreso', 'Salario', 'Estado', 'Acciones'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {empleadosFiltrados.map((emp) => {
                        const ec = ESTADO_CONFIG[emp.estado] ?? ESTADO_CONFIG.activo;
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary text-xs font-bold text-white">
                                  {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">{emp.nombre} {emp.apellido}</p>
                                  <p className="text-xs text-slate-400">{emp.email || emp.telefono || '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{emp.cargo}</td>
                            <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{CONTRATO_LABELS[emp.tipo_contrato] || emp.tipo_contrato}</span></td>
                            <td className="px-4 py-3 text-sm text-slate-500">{emp.fecha_ingreso ? new Date(emp.fecha_ingreso + 'T00:00:00').toLocaleDateString('es-CO') : '—'}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{fmt(emp.salario)}</td>
                            <td className="px-4 py-3"><span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', ec.color)}>{ec.label}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => openEdit(emp)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Edit2 className="h-4 w-4" /></button>
                                <button onClick={() => handleDelete(emp.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
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

          {activeTab === 'turnos' && <TurnosCalendario empleados={empleados} estacionId={selectedEstacion.id} />}
          {activeTab === 'asistencia' && <AsistenciaPanel empleados={empleados} estacionId={selectedEstacion.id} />}
          {activeTab === 'nomina' && <NominaPanel empleados={empleados} estacionId={selectedEstacion.id} />}
          {activeTab === 'vacaciones' && <VacacionesPanel empleados={empleados.map((e) => ({ ...e, fecha_ingreso: e.fecha_ingreso }))} estacionId={selectedEstacion.id} />}
          {activeTab === 'estadisticas' && <TalentoEstadisticas empleados={empleados} asistencias={asistencias} nominas={nominas} />}
          {activeTab === 'ia' && <TalentoIA empleados={empleados} asistencias={asistencias} nominas={nominas} />}
        </>
      )}

      <EmpleadoModal open={showModal} empleado={editEmpleado as Parameters<typeof EmpleadoModal>[0]['empleado']} estacionId={selectedEstacion?.id ?? null} onClose={() => setShowModal(false)} onSuccess={handleRefresh} />
    </div>
  );
}

function KpiCard({ label, value, icon, color, small }: { label: string; value: string; icon: React.ReactNode; color: string; small?: boolean }) {
  const cm: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600', teal: 'bg-teal-50 text-teal-600',
    violet: 'bg-violet-50 text-violet-600', slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <Card className="p-5">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cm[color] || 'bg-slate-100 text-slate-600')}>{icon}</div>
      <p className={cn('mt-4 font-bold text-slate-900', small ? 'text-base' : 'text-xl')}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </Card>
  );
}
