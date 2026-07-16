'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, Loader2, ChevronDown, ChevronRight, TrendingUp, XCircle, CheckCircle2, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import type { Turno } from './est-operacion';

type TurnoConCuadre = Turno & {
  cuadre?: { ventas_esperadas: number; total_entregado: number; diferencia: number; resultado: string; efectivo: number; tarjetas_credito: number; tarjetas_debito: number; transferencias: number; qr: number; credito_empresas: number; otros: number; observaciones_cuadre: string | null; };
  lecturas?: { nombre_manguera: string; numero_manguera: number; nombre_surtidor: string; nombre_isla: string; nombre_producto: string | null; color_producto: string; precio_litro: number; lectura_inicial: number | null; lectura_final: number | null; litros_vendidos: number | null; venta_total: number | null; }[];
};

const TURNO_LABELS: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
function fmt(v: number) { return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }); }

function ResultBadge({ resultado }: { resultado: string }) {
  const m = { correcto: { label: 'Correcto', color: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 }, sobrante: { label: 'Sobrante', color: 'bg-blue-50 text-blue-700', icon: TrendingUp }, faltante: { label: 'Faltante', color: 'bg-red-50 text-red-600', icon: XCircle } };
  const { label, color, icon: Icon } = m[resultado as keyof typeof m] ?? m.correcto;
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', color)}><Icon className="h-3 w-3" />{label}</span>;
}

interface Props { estacionId: string }

export function EstHistorial({ estacionId }: Props) {
  const [turnos, setTurnos] = useState<TurnoConCuadre[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TurnoConCuadre | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('est_turnos').select('*').eq('estacion_id', estacionId).in('estado', ['cerrado', 'con_diferencia']).order('created_at', { ascending: false }).limit(100);
    if (!data) { setLoading(false); return; }
    const turnoIds = (data as Turno[]).map((t) => t.id);
    const { data: cuadres } = await supabase.from('est_cuadres').select('*').in('turno_id', turnoIds);
    const map = new Map((cuadres ?? []).map((c) => [c.turno_id, c]));
    setTurnos((data as Turno[]).map((t) => ({ ...t, cuadre: map.get(t.id) })));
    setLoading(false);
  }, [estacionId]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const openDetail = async (t: TurnoConCuadre) => {
    setLoadingDetail(true);
    setSelected(t);
    const { data } = await supabase.from('est_lecturas').select('*').eq('turno_id', t.id).order('orden_isla').order('numero_surtidor').order('numero_manguera');
    setSelected({ ...t, lecturas: data ?? [] });
    setLoadingDetail(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Historial de turnos</h2>
        <p className="text-sm text-slate-500">{turnos.length} turno{turnos.length !== 1 ? 's' : ''} registrado{turnos.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : turnos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
          <FileText className="h-12 w-12 text-slate-200" />
          <p className="mt-3 text-sm text-slate-400">No hay turnos cerrados aún.</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {['Fecha', 'Empleado', 'Turno', 'Hora inicio', 'Hora fin', 'Litros', 'Ventas', 'Cuadre', 'Diferencia', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {turnos.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{new Date(t.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{t.empleado}</p>
                    {t.cargo && <p className="text-xs text-slate-400">{t.cargo}</p>}
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{TURNO_LABELS[t.tipo_turno]}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{t.hora_inicio}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{t.hora_fin_real ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono font-semibold text-blue-700">{t.total_litros !== null ? `${t.total_litros.toFixed(3)} gal` : '—'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">{t.total_ventas !== null ? fmt(t.total_ventas) : '—'}</td>
                  <td className="px-4 py-3">{t.cuadre ? <ResultBadge resultado={t.cuadre.resultado} /> : <span className="text-xs text-slate-400">—</span>}</td>
                  <td className="px-4 py-3 text-sm font-mono">
                    {t.cuadre ? (
                      <span className={cn('font-semibold', t.cuadre.resultado === 'correcto' ? 'text-emerald-600' : t.cuadre.resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600')}>
                        {t.cuadre.resultado === 'correcto' ? '$0' : fmt(Math.abs(t.cuadre.diferencia))}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => openDetail(t)}>
                      <Eye className="h-3.5 w-3.5" />Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected && `Turno ${TURNO_LABELS[selected.tipo_turno]} — ${selected.empleado} — ${selected.fecha}`}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 pt-2">
              {/* Turn info */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { l: 'Empleado', v: selected.empleado },
                  { l: 'Cargo', v: selected.cargo ?? '—' },
                  { l: 'Tipo', v: TURNO_LABELS[selected.tipo_turno] },
                  { l: 'Fecha', v: selected.fecha },
                  { l: 'Inicio', v: selected.hora_inicio },
                  { l: 'Cierre', v: selected.hora_fin_real ?? '—' },
                ].map((r) => (
                  <div key={r.l} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{r.l}</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{r.v}</p>
                  </div>
                ))}
              </div>

              {/* Lecturas table */}
              {loadingDetail ? (
                <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
              ) : selected.lecturas && (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {['Isla', 'Surtidor', 'Manguera', 'Producto', 'Inicial', 'Final', 'Litros', 'Venta'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {selected.lecturas.map((l, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-xs text-slate-500">{l.nombre_isla}</td>
                          <td className="px-3 py-2 text-xs text-slate-500">{l.nombre_surtidor}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full text-[8px] font-bold text-white flex items-center justify-center" style={{ background: l.color_producto }}>M{l.numero_manguera}</div>
                              <span className="text-xs font-medium text-slate-800">{l.nombre_manguera}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-700">{l.nombre_producto ?? '—'}</td>
                          <td className="px-3 py-2 text-xs font-mono text-slate-600">{l.lectura_inicial?.toFixed(3) ?? '—'}</td>
                          <td className="px-3 py-2 text-xs font-mono text-slate-600">{l.lectura_final?.toFixed(3) ?? '—'}</td>
                          <td className="px-3 py-2 text-xs font-semibold text-blue-700">{l.litros_vendidos?.toFixed(3) !== undefined ? `${l.litros_vendidos?.toFixed(3)} gal` : '—'}</td>
                          <td className="px-3 py-2 text-xs font-bold text-slate-900">{l.venta_total !== null ? fmt(l.venta_total) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td colSpan={6} className="px-3 py-2 text-right text-xs font-bold text-slate-600">TOTAL:</td>
                        <td className="px-3 py-2 text-xs font-bold text-emerald-700">{(selected.lecturas.reduce((s, l) => s + (l.litros_vendidos ?? 0), 0)).toFixed(3)} lt</td>
                        <td className="px-3 py-2 text-xs font-bold text-slate-900">{fmt(selected.lecturas.reduce((s, l) => s + (l.venta_total ?? 0), 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Cuadre */}
              {selected.cuadre && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-3 text-sm font-bold text-slate-900">Cuadre de caja</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-400">Ventas esperadas</p>
                      <p className="text-base font-bold text-slate-900">{fmt(selected.cuadre.ventas_esperadas)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-400">Total entregado</p>
                      <p className="text-base font-bold text-slate-900">{fmt(selected.cuadre.total_entregado)}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-400">Diferencia</p>
                      <p className={cn('text-base font-bold', selected.cuadre.resultado === 'correcto' ? 'text-emerald-600' : selected.cuadre.resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600')}>{fmt(Math.abs(selected.cuadre.diferencia))}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 text-center">
                      <p className="text-xs text-slate-400">Resultado</p>
                      <ResultBadge resultado={selected.cuadre.resultado} />
                    </div>
                  </div>
                  {selected.cuadre.observaciones_cuadre && (
                    <div className="mt-3 rounded-xl border border-amber-200/60 bg-amber-50/50 p-3">
                      <p className="text-xs font-semibold text-amber-800">Observación: {selected.cuadre.observaciones_cuadre}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
