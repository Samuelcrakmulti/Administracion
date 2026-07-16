'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, RotateCcw, Eye, Loader2, AlertTriangle,
  Clock, User, TrendingUp, BadgeCheck, Fuel, Droplet,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type TurnoPendiente = {
  id: string; empleado: string; cargo: string | null; tipo_turno: string;
  fecha: string; hora_inicio: string; hora_fin_real: string | null;
  estado: string; total_litros: number | null; total_ventas: number | null;
  supervisor_observaciones: string | null;
  cuadre?: { diferencia: number; resultado: string; ventas_esperadas: number; total_entregado: number };
};

const TURNO_MAP: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
function fmt(v: number) { return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }); }
function fmtGal(v: number) { return `${v.toLocaleString('es-CO', { maximumFractionDigits: 3 })} gal`; }

const ESTADO_CONF = {
  pendiente_aprobacion: { label: 'Pendiente', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  en_revision: { label: 'En revisión', bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
};

function EstadoBadge({ estado }: { estado: string }) {
  const conf = ESTADO_CONF[estado as keyof typeof ESTADO_CONF];
  if (!conf) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', conf.bg)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', conf.dot)} />{conf.label}
    </span>
  );
}

interface Props { estacionId: string }

export function EstAprobacion({ estacionId }: Props) {
  const [turnos, setTurnos] = useState<TurnoPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TurnoPendiente | null>(null);
  const [detailLecturas, setDetailLecturas] = useState<Record<string, unknown>[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | 'revision' | null>(null);
  const [supervisorNombre, setSupervisorNombre] = useState('');
  const [supervisorObs, setSupervisorObs] = useState('');
  const [procesando, setProcesando] = useState(false);

  const fetchPendientes = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('est_turnos').select('*')
      .eq('estacion_id', estacionId)
      .in('estado', ['pendiente_aprobacion', 'en_revision'])
      .order('created_at', { ascending: false });
    if (!data) { setLoading(false); return; }
    const ids = (data as TurnoPendiente[]).map((t) => t.id);
    const { data: cuadres } = await supabase.from('est_cuadres').select('turno_id, diferencia, resultado, ventas_esperadas, total_entregado').in('turno_id', ids);
    const cuadreMap = new Map((cuadres ?? []).map((c) => [c.turno_id, c]));
    setTurnos((data as TurnoPendiente[]).map((t) => ({ ...t, cuadre: cuadreMap.get(t.id) })));
    setLoading(false);
  }, [estacionId]);

  useEffect(() => { fetchPendientes(); }, [fetchPendientes]);

  const openDetail = async (t: TurnoPendiente) => {
    setSelected(t); setLoadingDetail(true);
    const { data } = await supabase.from('est_lecturas').select('*').eq('turno_id', t.id).order('orden_isla').order('numero_surtidor').order('numero_manguera');
    setDetailLecturas((data as Record<string, unknown>[]) ?? []);
    setLoadingDetail(false);
  };

  const handleAccion = async () => {
    if (!selected) return;
    if ((accion === 'rechazar' || accion === 'revision') && !supervisorObs.trim()) {
      toast.error('Escribe una observación para el vendedor.'); return;
    }
    setProcesando(true);
    try {
      const now = new Date().toISOString();
      let update: Record<string, unknown> = {};
      if (accion === 'aprobar') {
        const isDiff = selected.cuadre && Math.abs(selected.cuadre.diferencia) >= 1;
        update = { estado: isDiff ? 'con_diferencia' : 'cerrado', aprobado_por: supervisorNombre || 'Supervisor', aprobado_at: now };
        toast.success(isDiff ? 'Turno aprobado con diferencia.' : 'Turno aprobado correctamente.');
      } else {
        update = { estado: 'en_revision', rechazado_por: supervisorNombre || 'Supervisor', rechazado_at: now, supervisor_observaciones: supervisorObs };
        toast.success(accion === 'rechazar' ? 'Turno rechazado. El vendedor deberá corregir.' : 'Revisión solicitada al vendedor.');
      }
      await supabase.from('est_turnos').update(update).eq('id', selected.id);
      setAccion(null); setSelected(null); setSupervisorNombre(''); setSupervisorObs('');
      fetchPendientes();
    } catch (err) { toast.error('Error al procesar la acción.'); console.error(err); }
    finally { setProcesando(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Aprobación de turnos</h2>
        <p className="text-sm text-slate-500">{turnos.length} turno{turnos.length !== 1 ? 's' : ''} pendiente{turnos.length !== 1 ? 's' : ''} de aprobación</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : turnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
          <BadgeCheck className="h-14 w-14 text-slate-200" />
          <p className="mt-3 text-base font-semibold text-slate-600">Sin turnos pendientes</p>
          <p className="mt-1 text-sm text-slate-400">Todos los turnos están aprobados o no hay entregas por revisar.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {['Empleado', 'Turno', 'Fecha', 'Galones', 'Venta', 'Diferencia', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turnos.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{t.empleado}</p>
                    {t.cargo && <p className="text-xs text-slate-400">{t.cargo}</p>}
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{TURNO_MAP[t.tipo_turno]}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-600">{t.fecha}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-700">{t.total_litros !== null ? fmtGal(t.total_litros) : '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{t.total_ventas !== null ? fmt(t.total_ventas) : '—'}</td>
                  <td className="px-4 py-3">
                    {t.cuadre ? (
                      <span className={cn('text-sm font-bold', t.cuadre.resultado === 'correcto' ? 'text-emerald-600' : t.cuadre.resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600')}>
                        {t.cuadre.resultado === 'correcto' ? '$0' : fmt(Math.abs(t.cuadre.diferencia))}
                      </span>
                    ) : <span className="text-xs text-slate-400">Sin cuadre</span>}
                  </td>
                  <td className="px-4 py-3"><EstadoBadge estado={t.estado} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 px-2.5" onClick={() => openDetail(t)}><Eye className="h-3 w-3" />Ver</Button>
                      <Button size="sm" className="gap-1.5 text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setSelected(t); setAccion('aprobar'); }}><CheckCircle2 className="h-3 w-3" />Aprobar</Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 px-2.5 text-amber-600 hover:bg-amber-50 border-amber-200" onClick={() => { setSelected(t); setAccion('revision'); }}><RotateCcw className="h-3 w-3" />Revisión</Button>
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 px-2.5 text-red-500 hover:bg-red-50 border-red-200" onClick={() => { setSelected(t); setAccion('rechazar'); }}><XCircle className="h-3 w-3" />Rechazar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected && !accion} onOpenChange={(v) => { if (!v) { setSelected(null); setDetailLecturas([]); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle del turno — {selected?.empleado} — {selected?.fecha}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {[{ l: 'Empleado', v: selected.empleado }, { l: 'Cargo', v: selected.cargo ?? '—' }, { l: 'Turno', v: TURNO_MAP[selected.tipo_turno] }, { l: 'Fecha', v: selected.fecha }, { l: 'Inicio', v: selected.hora_inicio }, { l: 'Fin', v: selected.hora_fin_real ?? '—' }].map((r) => (
                  <div key={r.l} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-bold">{r.l}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{r.v}</p>
                  </div>
                ))}
              </div>
              {loadingDetail ? <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div> : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-slate-100 bg-slate-50">
                      {['Isla', 'Surtidor', 'Manguera', 'Producto', 'Inicial', 'Final', 'Galones', 'Venta'].map((h) => <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {detailLecturas.map((l: Record<string, unknown>, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-xs text-slate-500">{l.nombre_isla as string}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{l.nombre_surtidor as string}</td>
                          <td className="px-3 py-2"><div className="flex items-center gap-1.5"><div className="h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: l.color_producto as string }}>M{l.numero_manguera as number}</div><span className="text-xs font-medium text-slate-800">{l.nombre_manguera as string}</span></div></td>
                          <td className="px-3 py-2 text-xs text-slate-600">{(l.nombre_producto as string) ?? '—'}</td>
                          <td className="px-3 py-2 text-xs font-mono text-slate-600">{(l.lectura_inicial as number)?.toFixed(3) ?? '—'}</td>
                          <td className="px-3 py-2 text-xs font-mono text-slate-600">{(l.lectura_final as number)?.toFixed(3) ?? '—'}</td>
                          <td className="px-3 py-2 text-xs font-semibold text-blue-700">{l.litros_vendidos !== null ? fmtGal(l.litros_vendidos as number) : '—'}</td>
                          <td className="px-3 py-2 text-xs font-bold text-slate-900">{l.venta_total !== null ? fmt(l.venta_total as number) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={6} className="px-3 py-2 text-right text-xs font-bold text-slate-600">TOTAL:</td>
                      <td className="px-3 py-2 text-xs font-bold text-blue-700">{fmtGal(detailLecturas.reduce((s, l) => s + ((l.litros_vendidos as number) ?? 0), 0))}</td>
                      <td className="px-3 py-2 text-xs font-bold text-slate-900">{fmt(detailLecturas.reduce((s, l) => s + ((l.venta_total as number) ?? 0), 0))}</td>
                    </tr></tfoot>
                  </table>
                </div>
              )}
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => setAccion('aprobar')}><CheckCircle2 className="h-4 w-4" />Aprobar</Button>
                <Button variant="outline" className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50" onClick={() => setAccion('revision')}><RotateCcw className="h-4 w-4" />Solicitar revisión</Button>
                <Button variant="outline" className="gap-2 text-red-500 border-red-200 hover:bg-red-50" onClick={() => setAccion('rechazar')}><XCircle className="h-4 w-4" />Rechazar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action dialog */}
      <Dialog open={!!accion} onOpenChange={(v) => { if (!v) { setAccion(null); setSupervisorNombre(''); setSupervisorObs(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {accion === 'aprobar' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : accion === 'rechazar' ? <XCircle className="h-5 w-5 text-red-500" /> : <RotateCcw className="h-5 w-5 text-amber-500" />}
              {accion === 'aprobar' ? 'Aprobar turno' : accion === 'rechazar' ? 'Rechazar turno' : 'Solicitar revisión'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nombre del supervisor</Label>
              <Input value={supervisorNombre} onChange={(e) => setSupervisorNombre(e.target.value)} placeholder="Tu nombre completo" />
            </div>
            {accion !== 'aprobar' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Observación para el vendedor *</Label>
                <textarea value={supervisorObs} onChange={(e) => setSupervisorObs(e.target.value)} rows={3}
                  placeholder="Indica qué debe corregir el vendedor…"
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            )}
            {accion === 'aprobar' && selected?.cuadre && Math.abs(selected.cuadre.diferencia) >= 1 && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800">Este turno tiene una diferencia de {fmt(Math.abs(selected.cuadre.diferencia))}. Se registrará como "Con diferencia".</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setAccion(null); setSupervisorNombre(''); setSupervisorObs(''); }} disabled={procesando}>Cancelar</Button>
              <Button className={cn('flex-1 gap-2', accion === 'aprobar' ? 'bg-emerald-600 hover:bg-emerald-700' : accion === 'rechazar' ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600')} onClick={handleAccion} disabled={procesando}>
                {procesando ? <Loader2 className="h-4 w-4 animate-spin" /> : accion === 'aprobar' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {accion === 'aprobar' ? 'Confirmar aprobación' : accion === 'rechazar' ? 'Confirmar rechazo' : 'Solicitar revisión'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
