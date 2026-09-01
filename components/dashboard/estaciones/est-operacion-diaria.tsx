'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, Loader2,
  Lock, Unlock, FileText, RefreshCw, Activity, Fuel, DollarSign,
  Users, Truck, Scale, BellRing, ChevronRight, ShieldCheck, Building2,
  TrendingUp, TrendingDown, ClipboardCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type DayState = 'no_iniciado' | 'abierto' | 'en_operacion' | 'en_cierre' | 'cerrado' | 'reabierto';

type OperacionDiaria = {
  id: string;
  estacion_id: string;
  fecha: string;
  estado: DayState;
  inventario_inicial_confirmado: boolean;
  lecturas_iniciales_confirmadas: boolean;
  turnos_configurados: boolean;
  abierto_por: string | null;
  abierto_at: string | null;
  cerrado_por: string | null;
  cerrado_at: string | null;
  reabierto_por: string | null;
  reabierto_at: string | null;
  motivo_reapertura: string | null;
  resumen_cierre: Record<string, number | string> | null;
};

type Estacion = { id: string; nombre: string; ciudad: string | null };
type Tanque = {
  id: string; estacion_id: string; producto_id: string | null; nombre: string;
  capacidad_maxima_galones: number; nivel_actual_galones: number;
  nivel_alerta_galones: number; nivel_critico_galones: number; estado: string;
};
type Turno = {
  id: string; estacion_id: string; empleado: string; cargo: string;
  tipo_turno: string; fecha: string; hora_inicio: string; hora_fin_estimada: string;
  hora_fin_real: string | null; estado: string; total_galones: number | null;
  total_ventas: number | null;
};

const STATE_CONFIG: Record<DayState, { label: string; cls: string; dot: string; icon: typeof Activity }> = {
  no_iniciado: { label: 'No iniciado', cls: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400', icon: Clock },
  abierto: { label: 'Abierto', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: Unlock },
  en_operacion: { label: 'En operación', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: Activity },
  en_cierre: { label: 'En cierre', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: ClipboardCheck },
  cerrado: { label: 'Cerrado', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400', icon: Lock },
  reabierto: { label: 'Reabierto', cls: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', icon: Unlock },
};

const fmtCOP = (v: number) => v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
const fmtGal = (v: number) => v.toLocaleString('es-CO', { maximumFractionDigits: 2 });

export function EstOperacionDiaria({
  estacion,
  tanques,
  onGoToOperacion,
  onGoToCierre,
  onGoToCuadre,
  onGoToCarrotanques,
  onRefresh,
}: {
  estacion: Estacion;
  tanques: Tanque[];
  onGoToOperacion: () => void;
  onGoToCierre: () => void;
  onGoToCuadre: () => void;
  onGoToCarrotanques: () => void;
  onRefresh: () => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dayState, setDayState] = useState<OperacionDiaria | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [prevDayData, setPrevDayData] = useState<{ galones: number; ventas: number; turnosCerrados: number; alertasPendientes: number } | null>(null);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenMotivo, setReopenMotivo] = useState('');
  const [invInicial, setInvInicial] = useState<Record<string, string>>({});
  const [invConfirmado, setInvConfirmado] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDayState = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('est_operacion_diaria')
      .select('*')
      .eq('estacion_id', estacion.id)
      .eq('fecha', fecha)
      .maybeSingle();
    setDayState((data as OperacionDiaria) ?? null);
    setLoading(false);
  }, [estacion.id, fecha]);

  const fetchTurnos = useCallback(async () => {
    const { data } = await supabase
      .from('est_turnos')
      .select('id, estacion_id, empleado, cargo, tipo_turno, fecha, hora_inicio, hora_fin_estimada, hora_fin_real, estado, total_galones, total_ventas')
      .eq('estacion_id', estacion.id)
      .eq('fecha', fecha)
      .order('hora_inicio');
    setTurnos((data as Turno[]) ?? []);
  }, [estacion.id, fecha]);

  const fetchPrevDay = useCallback(async () => {
    const prevDate = new Date(fecha);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevStr = prevDate.toISOString().split('T')[0];

    const [{ data: prevLec }, { data: prevTurnos }, { data: prevAlerts }] = await Promise.all([
      supabase.from('est_lecturas').select('galones_vendidos').eq('estacion_id', estacion.id).eq('fecha', prevStr),
      supabase.from('est_turnos').select('estado').eq('estacion_id', estacion.id).eq('fecha', prevStr),
      supabase.from('est_alertas_inventario').select('id').eq('estacion_id', estacion.id).eq('atendida', false),
    ]);

    const galones = (prevLec ?? []).reduce((s, l) => s + (Number(l.galones_vendidos) || 0), 0);
    const ventas = (prevTurnos ?? []).filter((t) => t.estado === 'cerrado').reduce((s, t) => s + (Number((t as Turno).total_ventas) || 0), 0);
    const turnosCerrados = (prevTurnos ?? []).filter((t) => t.estado === 'cerrado').length;
    setPrevDayData({ galones, ventas, turnosCerrados, alertasPendientes: prevAlerts?.length ?? 0 });
  }, [estacion.id, fecha]);

  useEffect(() => { fetchDayState(); fetchTurnos(); }, [fetchDayState, fetchTurnos]);
  useEffect(() => { if (dayState?.estado === 'no_iniciado' || !dayState) fetchPrevDay(); }, [dayState, fetchPrevDay]);

  const logAudit = async (accion: string, tabla: string, registroId: string | null, campoMod?: string, valorAnt?: string, valorNue?: string, motivo?: string) => {
    await supabase.from('est_auditoria_general').insert({
      estacion_id: estacion.id,
      tabla_afectada: tabla,
      registro_id: registroId,
      accion,
      campo_modificado: campoMod ?? null,
      valor_anterior: valorAnt ?? null,
      valor_nuevo: valorNue ?? null,
      usuario: user?.email ?? 'sistema',
      motivo: motivo ?? null,
    });
  };

  const handleOpenDay = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('est_operacion_diaria')
        .insert({
          estacion_id: estacion.id,
          fecha,
          estado: 'abierto',
          abierto_por: user?.email ?? 'sistema',
          abierto_at: new Date().toISOString(),
          inventario_inicial_confirmado: invConfirmado,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Ya existe un registro de operación para esta fecha.');
        } else {
          toast.error('No se pudo abrir el día.');
        }
        setActionLoading(false);
        return;
      }

      await logAudit('creacion', 'est_operacion_diaria', data.id, 'estado', null, 'abierto', 'Apertura del día');
      setDayState(data as OperacionDiaria);
      setShowOpenDialog(false);
      toast.success('Día abierto correctamente.');
      onRefresh();
    } catch {
      toast.error('Error al abrir el día.');
    }
    setActionLoading(false);
  };

  const handleCloseDay = async () => {
    if (!dayState) return;
    setActionLoading(true);

    const turnosCerrados = turnos.filter((t) => t.estado === 'cerrado').length;
    const turnosPendientes = turnos.filter((t) => t.estado !== 'cerrado').length;

    if (turnosPendientes > 0) {
      toast.error(`No se puede cerrar el día: ${turnosPendientes} turno(s) sin cerrar.`);
      setActionLoading(false);
      setShowCloseDialog(false);
      return;
    }

    const { data: lecturas } = await supabase
      .from('est_lecturas')
      .select('galones_vendidos, venta_total')
      .eq('estacion_id', estacion.id)
      .eq('fecha', fecha);

    const totalGalones = (lecturas ?? []).reduce((s, l) => s + (Number(l.galones_vendidos) || 0), 0);
    const totalVentas = (lecturas ?? []).reduce((s, l) => s + (Number(l.venta_total) || 0), 0);

    const { data: carrots } = await supabase
      .from('est_carrotanques')
      .select('cantidad_galones')
      .eq('estacion_id', estacion.id)
      .eq('fecha', fecha);
    const totalEntradas = (carrots ?? []).reduce((s, c) => s + (Number(c.cantidad_galones) || 0), 0);

    const { data: cuadres } = await supabase
      .from('est_cuadres')
      .select('diferencia, resultado')
      .eq('estacion_id', estacion.id);
    const diferencias = (cuadres ?? []).filter((c) => c.resultado === 'faltante' || c.resultado === 'sobrante').length;

    const resumen = {
      galones_vendidos: totalGalones,
      ventas_totales: totalVentas,
      entradas_galones: totalEntradas,
      turnos_cerrados: turnosCerrados,
      diferencias,
      inventario_final: tanques.reduce((s, t) => s + (Number(t.nivel_actual_galones) || 0), 0),
    };

    const { data, error } = await supabase
      .from('est_operacion_diaria')
      .update({
        estado: 'cerrado',
        cerrado_por: user?.email ?? 'sistema',
        cerrado_at: new Date().toISOString(),
        resumen_cierre: resumen,
      })
      .eq('id', dayState.id)
      .select()
      .single();

    if (error) {
      toast.error('No se pudo cerrar el día.');
      setActionLoading(false);
      return;
    }

    await logAudit('modificacion', 'est_operacion_diaria', dayState.id, 'estado', dayState.estado, 'cerrado', 'Cierre del día');
    setDayState(data as OperacionDiaria);
    setShowCloseDialog(false);
    toast.success('Día cerrado correctamente.');
    onRefresh();
    setActionLoading(false);
  };

  const handleReopenDay = async () => {
    if (!dayState || !reopenMotivo.trim()) return;
    setActionLoading(true);

    const { data, error } = await supabase
      .from('est_operacion_diaria')
      .update({
        estado: 'reabierto',
        reabierto_por: user?.email ?? 'sistema',
        reabierto_at: new Date().toISOString(),
        motivo_reapertura: reopenMotivo.trim(),
      })
      .eq('id', dayState.id)
      .select()
      .single();

    if (error) {
      toast.error('No se pudo reabrir el día.');
      setActionLoading(false);
      return;
    }

    await logAudit('reapertura', 'est_operacion_diaria', dayState.id, 'estado', 'cerrado', 'reabierto', reopenMotivo.trim());
    setDayState(data as OperacionDiaria);
    setShowReopenDialog(false);
    setReopenMotivo('');
    toast.success('Día reabierto. Registra el motivo en la auditoría.');
    onRefresh();
    setActionLoading(false);
  };

  const handleConfirmInventory = async () => {
    if (!dayState) return;
    setActionLoading(true);

    const tanquesWithDiff = tanques.filter((t) => {
      const lectura = parseFloat(invInicial[t.id] ?? '');
      if (isNaN(lectura)) return false;
      return Math.abs(lectura - (Number(t.nivel_actual_galones) || 0)) > 0.5;
    });

    const { data, error } = await supabase
      .from('est_operacion_diaria')
      .update({ inventario_inicial_confirmado: true })
      .eq('id', dayState.id)
      .select()
      .single();

    if (error) {
      toast.error('No se pudo confirmar el inventario.');
      setActionLoading(false);
      return;
    }

    await logAudit('modificacion', 'est_operacion_diaria', dayState.id, 'inventario_inicial_confirmado', 'false', 'true', 'Confirmación de inventario inicial');
    setDayState(data as OperacionDiaria);
    setInvConfirmado(true);
    setActionLoading(false);

    if (tanquesWithDiff.length > 0) {
      toast.warning(`Inventario confirmado con ${tanquesWithDiff.length} diferencia(s) en tanques.`);
    } else {
      toast.success('Inventario inicial confirmado.');
    }
  };

  const turnosCerrados = turnos.filter((t) => t.estado === 'cerrado').length;
  const turnosActivos = turnos.filter((t) => t.estado === 'abierto' || t.estado === 'en_revision' || t.estado === 'pendiente_aprobacion').length;
  const allTurnosClosed = turnos.length > 0 && turnosCerrados === turnos.length;

  const stateCfg = dayState ? STATE_CONFIG[dayState.estado] : STATE_CONFIG.no_iniciado;

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Operación del Día</h2>
          <p className="text-xs text-slate-500">{estacion.nombre} — {fecha}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-9 w-36 text-sm" />
          <button onClick={() => { fetchDayState(); fetchTurnos(); }} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className={cn('flex items-center gap-3 rounded-xl border p-4', stateCfg.cls)}>
        <stateCfg.icon className="h-5 w-5" />
        <div className="flex-1">
          <p className="text-sm font-bold">{stateCfg.label}</p>
          <p className="text-xs opacity-70">
            {dayState?.abierto_at && `Abierto: ${new Date(dayState.abierto_at).toLocaleString('es-CO')}`}
            {dayState?.cerrado_at && ` · Cerrado: ${new Date(dayState.cerrado_at).toLocaleString('es-CO')}`}
          </p>
        </div>
        {dayState?.reabierto_at && (
          <Badge className="bg-orange-100 text-orange-700 text-[10px]">Reabierto: {dayState.motivo_reapertura}</Badge>
        )}
      </div>

      {/* Actions based on state */}
      {!dayState || dayState.estado === 'no_iniciado' ? (
        <>
          {/* Previous day summary */}
          {prevDayData && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Cierre del día anterior</p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{fmtGal(prevDayData.galones)}</p>
                  <p className="text-[10px] text-slate-500">Galones vendidos</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{fmtCOP(prevDayData.ventas)}</p>
                  <p className="text-[10px] text-slate-500">Ventas</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{prevDayData.turnosCerrados}</p>
                  <p className="text-[10px] text-slate-500">Turnos cerrados</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{prevDayData.alertasPendientes}</p>
                  <p className="text-[10px] text-slate-500">Alertas pendientes</p>
                </div>
              </div>
            </Card>
          )}

          {/* Initial inventory confirmation */}
          {tanques.length > 0 && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Inventario inicial de combustible</p>
              <div className="space-y-2">
                {tanques.map((t) => {
                  const lectura = invInicial[t.id] ?? '';
                  const nivelAnt = Number(t.nivel_actual_galones) || 0;
                  const lecturaNum = parseFloat(lectura) || 0;
                  const diff = lectura ? lecturaNum - nivelAnt : 0;
                  const hasDiff = lectura && Math.abs(diff) > 0.5;
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{t.nombre}</p>
                        <p className="text-xs text-slate-500">Nivel anterior: {fmtGal(nivelAnt)} gal</p>
                      </div>
                      <div className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Lectura física"
                          value={lectura}
                          onChange={(e) => setInvInicial((p) => ({ ...p, [t.id]: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="w-20 text-right">
                        {hasDiff ? (
                          <span className={cn('text-xs font-semibold', diff < 0 ? 'text-red-600' : 'text-amber-600')}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                          </span>
                        ) : lectura ? (
                          <span className="text-xs font-semibold text-emerald-600">OK</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Button onClick={() => setShowOpenDialog(true)} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 text-sm">
            <Unlock className="h-4 w-4" />Abrir día
          </Button>
        </>
      ) : dayState.estado === 'cerrado' ? (
        <>
          {/* Closed day summary */}
          {dayState.resumen_cierre && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Resumen del cierre</p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <div className="rounded-lg bg-amber-50 p-3 text-center">
                  <p className="text-lg font-bold text-amber-700">{fmtGal(Number(dayState.resumen_cierre.galones_vendidos) || 0)}</p>
                  <p className="text-[10px] text-amber-600">Galones vendidos</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{fmtCOP(Number(dayState.resumen_cierre.ventas_totales) || 0)}</p>
                  <p className="text-[10px] text-blue-600">Ventas totales</p>
                </div>
                <div className="rounded-lg bg-cyan-50 p-3 text-center">
                  <p className="text-lg font-bold text-cyan-700">{fmtGal(Number(dayState.resumen_cierre.entradas_galones) || 0)}</p>
                  <p className="text-[10px] text-cyan-600">Entradas</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{Number(dayState.resumen_cierre.turnos_cerrados) || 0}</p>
                  <p className="text-[10px] text-slate-500">Turnos cerrados</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{Number(dayState.resumen_cierre.diferencias) || 0}</p>
                  <p className="text-[10px] text-slate-500">Diferencias</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-lg font-bold text-slate-700">{fmtGal(Number(dayState.resumen_cierre.inventario_final) || 0)}</p>
                  <p className="text-[10px] text-slate-500">Inventario final</p>
                </div>
              </div>
            </Card>
          )}

          <Button onClick={() => setShowReopenDialog(true)} variant="outline" className="w-full gap-2 text-sm border-orange-300 text-orange-700 hover:bg-orange-50">
            <Lock className="h-4 w-4" />Reabrir día (requiere autorización)
          </Button>
        </>
      ) : (
        <>
          {/* Active day - checklists and turnos */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card className={cn('p-4 border-2', dayState.inventario_inicial_confirmado ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200')}>
              <div className="flex items-center gap-2">
                {dayState.inventario_inicial_confirmado ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-slate-400" />}
                <p className="text-xs font-semibold text-slate-700">Inventario inicial</p>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{dayState.inventario_inicial_confirmado ? 'Confirmado' : 'Pendiente'}</p>
            </Card>
            <Card className={cn('p-4 border-2', turnos.length > 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200')}>
              <div className="flex items-center gap-2">
                {turnos.length > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-slate-400" />}
                <p className="text-xs font-semibold text-slate-700">Turnos configurados</p>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{turnos.length} turno(s)</p>
            </Card>
            <Card className={cn('p-4 border-2', allTurnosClosed ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200')}>
              <div className="flex items-center gap-2">
                {allTurnosClosed ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-slate-400" />}
                <p className="text-xs font-semibold text-slate-700">Turnos cerrados</p>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">{turnosCerrados}/{turnos.length}</p>
            </Card>
          </div>

          {/* Turnos list */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Turnos del día</h3>
              <Button size="sm" variant="outline" onClick={onGoToOperacion} className="gap-1.5 text-xs">
                <Activity className="h-3.5 w-3.5" />Ir a operación
              </Button>
            </div>
            {turnos.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Users className="h-8 w-8 text-slate-300" />
                <p className="mt-3 text-xs text-slate-500">No hay turnos creados para hoy.</p>
                <Button size="sm" className="mt-3 bg-amber-600 hover:bg-amber-700 gap-1.5 text-xs" onClick={onGoToOperacion}>
                  <Activity className="h-3.5 w-3.5" />Crear turno
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {turnos.map((t) => {
                  const estadoCfg: Record<string, { label: string; cls: string; icon: string }> = {
                    abierto: { label: 'En operación', cls: 'bg-emerald-50 text-emerald-700', icon: '🟢' },
                    pendiente_aprobacion: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700', icon: '🟡' },
                    en_revision: { label: 'En revisión', cls: 'bg-blue-50 text-blue-700', icon: '🔵' },
                    cerrado: { label: 'Cerrado', cls: 'bg-slate-100 text-slate-500', icon: '⚪' },
                  };
                  const cfg = estadoCfg[t.estado] ?? { label: t.estado, cls: 'bg-slate-100 text-slate-500', icon: '⚪' };
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{t.empleado}</p>
                        <p className="text-xs text-slate-500">{t.tipo_turno} · {t.hora_inicio} - {t.hora_fin_estimada}</p>
                      </div>
                      <div className="text-right">
                        {t.total_galones != null && <p className="text-xs text-slate-600">{fmtGal(Number(t.total_galones))} gal</p>}
                        {t.total_ventas != null && <p className="text-xs text-slate-600">{fmtCOP(Number(t.total_ventas))}</p>}
                      </div>
                      <Badge className={cn('text-[10px]', cfg.cls)}>{cfg.icon} {cfg.label}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button variant="outline" onClick={onGoToOperacion} className="gap-1.5 text-xs h-auto py-3 flex-col">
              <Activity className="h-5 w-5 text-amber-500" />
              <span>Operar turno</span>
            </Button>
            <Button variant="outline" onClick={onGoToCuadre} className="gap-1.5 text-xs h-auto py-3 flex-col">
              <Scale className="h-5 w-5 text-blue-500" />
              <span>Cuadre de caja</span>
            </Button>
            <Button variant="outline" onClick={onGoToCarrotanques} className="gap-1.5 text-xs h-auto py-3 flex-col">
              <Truck className="h-5 w-5 text-cyan-500" />
              <span>Entrada combustible</span>
            </Button>
            <Button variant="outline" onClick={onGoToCierre} className="gap-1.5 text-xs h-auto py-3 flex-col">
              <ClipboardCheck className="h-5 w-5 text-violet-500" />
              <span>Cierre operativo</span>
            </Button>
          </div>

          {/* Close day button */}
          {allTurnosClosed ? (
            <Button onClick={() => setShowCloseDialog(true)} className="w-full bg-slate-800 hover:bg-slate-900 gap-2 text-sm">
              <Lock className="h-4 w-4" />Cerrar día
            </Button>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <p className="text-xs text-amber-700">
                {turnos.length === 0
                  ? 'No hay turnos creados para este día.'
                  : `${turnos.length - turnosCerrados} turno(s) sin cerrar. Cierra todos los turnos antes de cerrar el día.`}
              </p>
            </div>
          )}
        </>
      )}

      {/* Open day dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir día — {fecha}</DialogTitle>
            <DialogDescription>
              Vas a abrir la operación del día para {estacion.nombre}. Verifica el inventario inicial antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Checklist de apertura:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  {tanques.length > 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <XCircle className="h-3.5 w-3.5 text-slate-300" />}
                  {tanques.length} tanque(s) configurados
                </li>
                <li className="flex items-center gap-2">
                  {Object.keys(invInicial).length > 0 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Clock className="h-3.5 w-3.5 text-slate-300" />}
                  {Object.keys(invInicial).length}/{tanques.length} lecturas de inventario
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>Cancelar</Button>
            <Button onClick={handleOpenDay} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
              Confirmar apertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close day dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar día — {fecha}</DialogTitle>
            <DialogDescription>
              Al cerrar el día, el estado cambiará a "Cerrado" y se guardará un resumen. Podrás reabrirlo si necesitas hacer cambios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Turnos cerrados:</span><span className="font-semibold text-slate-800">{turnosCerrados}/{turnos.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Empleado que cierra:</span><span className="font-semibold text-slate-800">{user?.email ?? 'sistema'}</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Cancelar</Button>
            <Button onClick={handleCloseDay} disabled={actionLoading} className="bg-slate-800 hover:bg-slate-900 gap-1.5">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Confirmar cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen dialog */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir día — {fecha}</DialogTitle>
            <DialogDescription>
              Esta acción requiere autorización administrativa. Se registrará quién reabrió el día y el motivo. El estado cambiará a "Reabierto".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-lg bg-orange-50 border border-orange-200 p-3">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <p className="text-xs text-orange-700">Esta acción quedará registrada en la auditoría. No se eliminará el historial del cierre anterior.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Motivo de reapertura *</Label>
              <Textarea
                value={reopenMotivo}
                onChange={(e) => setReopenMotivo(e.target.value)}
                placeholder="Describe el motivo por el que necesitas reabrir este día..."
                className="text-sm"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)}>Cancelar</Button>
            <Button onClick={handleReopenDay} disabled={actionLoading || !reopenMotivo.trim()} className="bg-orange-600 hover:bg-orange-700 gap-1.5">
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
              Confirmar reapertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Corporate multi-station view
export function EstOperacionCorporativa({ estaciones }: { estaciones: Estacion[] }) {
  const [loading, setLoading] = useState(true);
  const [dayStates, setDayStates] = useState<Record<string, OperacionDiaria | null>>({});
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('est_operacion_diaria')
        .select('*')
        .eq('fecha', today);
      const map: Record<string, OperacionDiaria | null> = {};
      (data as OperacionDiaria[] | null)?.forEach((d) => { map[d.estacion_id] = d; });
      estaciones.forEach((e) => { if (!map[e.id]) map[e.id] = null; });
      setDayStates(map);
      setLoading(false);
    };
    if (estaciones.length > 0) fetchAll();
  }, [estaciones, today]);

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-amber-600" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-amber-600" />
        <h2 className="text-lg font-bold text-slate-900">Vista corporativa — {today}</h2>
      </div>

      {estaciones.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-slate-300" />
          <p className="mt-4 text-sm font-semibold text-slate-600">No hay estaciones configuradas</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {estaciones.map((est) => {
            const ds = dayStates[est.id];
            const state = ds?.estado ?? 'no_iniciado';
            const cfg = STATE_CONFIG[state as DayState];
            return (
              <Card key={est.id} className={cn('p-5 border-2', cfg.cls.split(' ')[0])}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{est.nombre}</p>
                    {est.ciudad && <p className="text-xs text-slate-500">{est.ciudad}</p>}
                  </div>
                  <cfg.icon className="h-5 w-5" />
                </div>
                <Badge className={cn('text-[10px]', cfg.cls)}>{cfg.label}</Badge>
                {ds?.resumen_cierre && (
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Galones:</span> <span className="font-semibold">{fmtGal(Number(ds.resumen_cierre.galones_vendidos) || 0)}</span></div>
                    <div><span className="text-slate-500">Turnos:</span> <span className="font-semibold">{Number(ds.resumen_cierre.turnos_cerrados) || 0}</span></div>
                    <div><span className="text-slate-500">Diferencias:</span> <span className="font-semibold">{Number(ds.resumen_cierre.diferencias) || 0}</span></div>
                    <div><span className="text-slate-500">Inventario:</span> <span className="font-semibold">{fmtGal(Number(ds.resumen_cierre.inventario_final) || 0)}</span></div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
