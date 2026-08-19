'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Save, Loader2, Building2, Calendar, Clock, User, CreditCard,
  ClipboardCheck, Fuel, Ticket, Database, FileText,
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Lock, History,
  ChevronRight, Scale,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Estacion } from './est-estaciones';
import { EstCierreLecturas } from './est-cierre-lecturas';
import { EstCierreVentas } from './est-cierre-ventas';
import { EstCierrePagos } from './est-cierre-pagos';
import { EstCierreCuadre } from './est-cierre-cuadre';
import type { Isla, Surtidor, Manguera, Producto } from './est-cierre-lecturas';

export type Cierre = {
  id: string;
  estacion_id: string;
  turno_id: string | null;
  empleado_id: string | null;
  fecha: string;
  turno_label: string;
  empleado_nombre: string | null;
  empleado_cargo: string | null;
  empleado_documento: string | null;
  estado: string;
  observaciones: string | null;
  revisado_por: string | null;
  revisado_at: string | null;
  revision_comentarios: string | null;
  aprobado_por: string | null;
  aprobado_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CierreAuditoria = {
  id: string;
  cierre_id: string;
  accion: string;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  usuario: string | null;
  motivo: string | null;
  created_at: string;
};

const ESTADOS = [
  { value: 'borrador', label: 'Borrador', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { value: 'pendiente_revision', label: 'Pendiente de Revisión', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  { value: 'cerrado', label: 'Cerrado', color: 'bg-slate-800 text-white border-slate-800', dot: 'bg-slate-300' },
];

const estadoInfo = (val: string) => ESTADOS.find((e) => e.value === val) ?? ESTADOS[0];

const isClosed = (estado: string) => estado === 'cerrado';

type SeccionKey = 'info' | 'lecturas' | 'ventas' | 'pagos' | 'vales' | 'cuadre' | 'observaciones' | 'revision';

const SECCIONES: { key: SeccionKey; label: string; icon: typeof Building2; desc: string }[] = [
  { key: 'info', label: 'Información', icon: Building2, desc: 'Datos del turno' },
  { key: 'lecturas', label: 'Lecturas', icon: Fuel, desc: 'Iniciales/finales de mangueras' },
  { key: 'ventas', label: 'Ventas', icon: CreditCard, desc: 'Galones y venta total' },
  { key: 'pagos', label: 'Pagos', icon: CreditCard, desc: 'Medios de pago' },
  { key: 'vales', label: 'Vales', icon: Ticket, desc: 'Vales y ajustes' },
  { key: 'cuadre', label: 'Cuadre', icon: Scale, desc: 'Cuadre del turno' },
  { key: 'observaciones', label: 'Observaciones', icon: FileText, desc: 'Novedades del turno' },
  { key: 'revision', label: 'Revisión', icon: ShieldCheck, desc: 'Aprobación y auditoría' },
];

interface Props {
  cierre: Cierre;
  estacion: Estacion;
  islas: Isla[];
  surtidores: Surtidor[];
  mangueras: Manguera[];
  productos: Producto[];
  onBack: () => void;
  onRefresh: () => void;
}

export function EstCierreDetalle({ cierre, estacion, islas, surtidores, mangueras, productos, onBack, onRefresh }: Props) {
  const { user } = useAuth();
  const [activeSeccion, setActiveSeccion] = useState<SeccionKey>('info');
  const [observaciones, setObservaciones] = useState(cierre.observaciones ?? '');
  const [revisionComentarios, setRevisionComentarios] = useState(cierre.revision_comentarios ?? '');
  const [saving, setSaving] = useState(false);
  const [savingState, setSavingState] = useState(false);
  const [audit, setAudit] = useState<CierreAuditoria[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [estadoActual, setEstadoActual] = useState(cierre.estado);
  const [lecturasCompletas, setLecturasCompletas] = useState(0);
  const [lecturasTotal, setLecturasTotal] = useState(0);
  const [lecturasInconsistencias, setLecturasInconsistencias] = useState(0);

  const readOnly = isClosed(estadoActual);

  const handleLecturasChange = useCallback((completas: number, total: number, inconsistencias: number) => {
    setLecturasCompletas(completas);
    setLecturasTotal(total);
    setLecturasInconsistencias(inconsistencias);
  }, []);

  const fetchAudit = useCallback(async () => {
    setLoadingAudit(true);
    const { data } = await supabase
      .from('est_cierre_auditoria')
      .select('*')
      .eq('cierre_id', cierre.id)
      .order('created_at', { ascending: false });
    setAudit((data as CierreAuditoria[]) ?? []);
    setLoadingAudit(false);
  }, [cierre.id]);

  useEffect(() => {
    setObservaciones(cierre.observaciones ?? '');
    setRevisionComentarios(cierre.revision_comentarios ?? '');
    setEstadoActual(cierre.estado);
    fetchAudit();
  }, [cierre.id, cierre.observaciones, cierre.revision_comentarios, cierre.estado, fetchAudit]);

  const registrarAuditoria = async (
    accion: string,
    estadoAnterior: string | null,
    estadoNuevo: string | null,
    motivo?: string
  ) => {
    await supabase.from('est_cierre_auditoria').insert({
      cierre_id: cierre.id,
      accion,
      estado_anterior: estadoAnterior,
      estado_nuevo: estadoNuevo,
      usuario: user?.email ?? 'Sistema',
      motivo: motivo ?? null,
    });
  };

  const cambiarEstado = async (nuevoEstado: string, motivo?: string) => {
    if (nuevoEstado === estadoActual) return;
    setSavingState(true);
    try {
      const update: Record<string, unknown> = {
        estado: nuevoEstado,
        updated_by: user?.email ?? null,
        updated_at: new Date().toISOString(),
      };
      if (nuevoEstado === 'pendiente_revision') {
        update.revisado_por = user?.email ?? null;
        update.revisado_at = new Date().toISOString();
      }
      if (nuevoEstado === 'aprobado') {
        update.aprobado_por = user?.email ?? null;
        update.aprobado_at = new Date().toISOString();
        update.revision_comentarios = revisionComentarios || null;
      }
      if (nuevoEstado === 'rechazado') {
        update.revision_comentarios = revisionComentarios || null;
      }

      const { error } = await supabase.from('est_cierres').update(update).eq('id', cierre.id);
      if (error) throw error;

      await registrarAuditoria('cambio_estado', estadoActual, nuevoEstado, motivo);

      setEstadoActual(nuevoEstado);
      toast.success(`Estado cambiado a: ${estadoInfo(nuevoEstado).label}`);
      fetchAudit();
      onRefresh();
    } catch (err) {
      toast.error('Error al cambiar el estado.');
      console.error(err);
    } finally {
      setSavingState(false);
    }
  };

  const guardarObservaciones = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('est_cierres')
        .update({
          observaciones: observaciones || null,
          updated_by: user?.email ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cierre.id);
      if (error) throw error;
      await registrarAuditoria('edicion', null, null, 'Observaciones actualizadas');
      toast.success('Guardado correctamente.');
      fetchAudit();
      onRefresh();
    } catch (err) {
      toast.error('Error al guardar.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const guardarRevision = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('est_cierres')
        .update({
          revision_comentarios: revisionComentarios || null,
          updated_by: user?.email ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cierre.id);
      if (error) throw error;
      await registrarAuditoria('edicion', null, null, 'Comentarios de revisión actualizados');
      toast.success('Comentarios de revisión guardados.');
      fetchAudit();
      onRefresh();
    } catch (err) {
      toast.error('Error al guardar.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const eInfo = estadoInfo(estadoActual);
  const progresoIdx = SECCIONES.findIndex((s) => s.key === activeSeccion);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <button onClick={onBack} className="mt-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">Cierre Operativo</h2>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', eInfo.color)}>
              <span className={cn('h-2 w-2 rounded-full', eInfo.dot, estadoActual === 'en_proceso' && 'animate-pulse')} />
              {eInfo.label}
            </span>
            {readOnly && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white">
                <Lock className="h-3 w-3" /> Cerrado
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-amber-500" />{estacion.nombre}</span>
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-blue-500" />{new Date(cierre.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-violet-500" />{cierre.turno_label}</span>
            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-emerald-500" />{cierre.empleado_nombre ?? 'Sin asignar'}</span>
          </div>
        </div>
      </div>

      {/* Progress + section nav */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-1 min-w-max">
          {SECCIONES.map((s, i) => {
            const active = activeSeccion === s.key;
            const done = i < progresoIdx;
            return (
              <button
                key={s.key}
                onClick={() => setActiveSeccion(s.key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                  active ? 'bg-amber-600 text-white shadow-md' : done ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <span className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  active ? 'bg-white/20 text-white' : done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                )}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section content */}
      <div className="animate-in fade-in duration-200">
        {activeSeccion === 'info' && (
          <Card className="p-6 space-y-5">
            <SectionTitle icon={Building2} title="Información del Turno" desc="Datos principales del cierre operativo" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField icon={Building2} label="Estación" value={estacion.nombre} sub={estacion.ciudad ?? undefined} />
              <InfoField icon={Calendar} label="Fecha" value={new Date(cierre.fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
              <InfoField icon={Clock} label="Turno" value={cierre.turno_label} />
              <InfoField icon={User} label="Empleado responsable" value={cierre.empleado_nombre ?? 'Sin asignar'} sub={cierre.empleado_cargo ?? undefined} />
              <InfoField icon={CreditCard} label="Identificación" value={cierre.empleado_documento ?? '—'} />
              <InfoField icon={ClipboardCheck} label="Estado" value={eInfo.label} />
            </div>
            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
              {!readOnly && estadoActual === 'borrador' && (
                <Button onClick={() => cambiarEstado('en_proceso')} disabled={savingState} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  {savingState ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  Iniciar proceso
                </Button>
              )}
              {!readOnly && estadoActual === 'en_proceso' && (
                <Button
                  onClick={() => cambiarEstado('pendiente_revision')}
                  disabled={savingState || (lecturasTotal > 0 && lecturasCompletas < lecturasTotal) || lecturasInconsistencias > 0}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
                  title={lecturasTotal > 0 && lecturasCompletas < lecturasTotal ? 'Faltan lecturas por completar' : lecturasInconsistencias > 0 ? 'Hay inconsistencias sin resolver' : 'Enviar a revisión'}
                >
                  {savingState ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Enviar a revisión
                </Button>
              )}
              {estadoActual === 'pendiente_revision' && (
                <>
                  <Button onClick={() => cambiarEstado('aprobado')} disabled={savingState} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    {savingState ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Aprobar
                  </Button>
                  <Button onClick={() => cambiarEstado('rechazado')} disabled={savingState} variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                    {savingState ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Rechazar
                  </Button>
                </>
              )}
              {estadoActual === 'aprobado' && (
                <Button onClick={() => cambiarEstado('cerrado')} disabled={savingState} className="gap-2 bg-slate-800 hover:bg-slate-900">
                  {savingState ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Cerrar definitivamente
                </Button>
              )}
              {estadoActual === 'rechazado' && (
                <Button onClick={() => cambiarEstado('en_proceso')} disabled={savingState} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  {savingState ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  Volver a proceso
                </Button>
              )}
            </div>
          </Card>
        )}

        {activeSeccion === 'lecturas' && (
          <EstCierreLecturas
            cierre={cierre}
            estacion={estacion}
            islas={islas}
            surtidores={surtidores}
            mangueras={mangueras}
            productos={productos}
            readOnly={readOnly}
            onLecturasChange={handleLecturasChange}
          />
        )}

        {activeSeccion === 'ventas' && (
          <EstCierreVentas cierre={cierre} estacion={estacion} islas={islas} surtidores={surtidores} mangueras={mangueras} productos={productos} />
        )}

        {activeSeccion === 'pagos' && (
          <EstCierrePagos cierre={cierre} estacion={estacion} readOnly={readOnly} />
        )}

        {activeSeccion === 'vales' && (
          <EstCierrePagos cierre={cierre} estacion={estacion} readOnly={readOnly} />
        )}

        {activeSeccion === 'cuadre' && (
          <EstCierreCuadre cierre={cierre} estacion={estacion} readOnly={readOnly} />
        )}

        {activeSeccion === 'observaciones' && (
          <Card className="p-6 space-y-4">
            <SectionTitle icon={FileText} title="Observaciones" desc="Novedades del turno" />
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observaciones del turno</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={5}
                placeholder="Registra aquí las novedades, incidencias o comentarios del turno..."
                disabled={readOnly}
              />
            </div>
            {!readOnly && (
              <Button onClick={guardarObservaciones} disabled={saving} className="gap-2 bg-amber-600 hover:bg-amber-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar observaciones
              </Button>
            )}
            {readOnly && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" />Este cierre está cerrado y no puede modificarse.</p>
            )}
          </Card>
        )}

        {activeSeccion === 'revision' && (
          <div className="space-y-5">
            <Card className="p-6 space-y-4">
              <SectionTitle icon={ShieldCheck} title="Revisión" desc="Aprobación y comentarios del supervisor" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoField icon={User} label="Revisado por" value={cierre.revisado_por ?? 'Pendiente'} />
                <InfoField icon={Calendar} label="Fecha de revisión" value={cierre.revisado_at ? new Date(cierre.revisado_at).toLocaleString('es-CO') : 'Pendiente'} />
                <InfoField icon={CheckCircle2} label="Aprobado por" value={cierre.aprobado_por ?? 'Pendiente'} />
                <InfoField icon={Calendar} label="Fecha de aprobación" value={cierre.aprobado_at ? new Date(cierre.aprobado_at).toLocaleString('es-CO') : 'Pendiente'} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Comentarios de revisión</Label>
                <Textarea
                  value={revisionComentarios}
                  onChange={(e) => setRevisionComentarios(e.target.value)}
                  rows={4}
                  placeholder="Comentarios del supervisor sobre el cierre..."
                  disabled={readOnly}
                />
              </div>
              {!readOnly && (
                <Button onClick={guardarRevision} disabled={saving} variant="outline" className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar comentarios
                </Button>
              )}
            </Card>

            {/* Auditoría */}
            <Card className="p-6 space-y-4">
              <SectionTitle icon={History} title="Auditoría" desc="Registro de cambios en este cierre" />
              {loadingAudit ? (
                <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
              ) : audit.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin registros de auditoría todavía.</p>
              ) : (
                <div className="space-y-2">
                  {audit.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                        <History className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800">{a.accion.replace(/_/g, ' ')}</span>
                          {a.estado_anterior && a.estado_nuevo && (
                            <span className="flex items-center gap-1 text-xs">
                              <Badge variant="outline" className="text-[10px]">{estadoInfo(a.estado_anterior).label}</Badge>
                              <ChevronRight className="h-3 w-3 text-slate-400" />
                              <Badge variant="outline" className="text-[10px]">{estadoInfo(a.estado_nuevo).label}</Badge>
                            </span>
                          )}
                        </div>
                        {a.motivo && <p className="mt-0.5 text-xs text-slate-500">{a.motivo}</p>}
                        <p className="mt-0.5 text-xs text-slate-400">
                          {a.usuario ?? 'Sistema'} · {new Date(a.created_at).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Creation info */}
              <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
                <span>Creado por: <strong className="text-slate-600">{cierre.created_by ?? 'Sistema'}</strong></span>
                <span>Creado: <strong className="text-slate-600">{new Date(cierre.created_at).toLocaleString('es-CO')}</strong></span>
                {cierre.updated_by && <span>Modificado por: <strong className="text-slate-600">{cierre.updated_by}</strong></span>}
                {cierre.updated_at && <span>Modificado: <strong className="text-slate-600">{new Date(cierre.updated_at).toLocaleString('es-CO')}</strong></span>}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, desc }: { icon: typeof Building2; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function InfoField({ icon: Icon, label, value, sub }: { icon: typeof Building2; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-sm font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function PlaceholderSection({ icon: Icon, title, desc, future }: { icon: typeof Building2; title: string; desc: string; future: string }) {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Icon className="h-8 w-8 text-slate-300" />
        </div>
        <h3 className="mt-5 text-base font-bold text-slate-700">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{desc}</p>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50/60 border border-blue-100 px-4 py-2.5 text-xs text-blue-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {future}
        </div>
      </div>
    </Card>
  );
}
