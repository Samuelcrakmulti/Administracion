'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Fuel, User, Clock, Award, Gauge, Droplet, Package, BadgeCheck,
  AlertTriangle, CheckCircle2, TrendingUp, XCircle, Loader2,
  RotateCcw, PenLine, ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Turno, Lectura } from './est-operacion';
import type { Estacion } from './est-estaciones';
import type { Surtidor } from './est-surtidores';

const TURNO_MAP: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
const METODO_LABELS: Record<string, string> = { efectivo: 'Efectivo', tarjetas_credito: 'T. Crédito', tarjetas_debito: 'T. Débito', transferencias: 'Transferencias', qr: 'Código QR', credito_empresas: 'Crédito Empresas', otros: 'Otros' };

function fmt(v: number) { return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }); }
function fmtGal(v: number) { return `${v.toLocaleString('es-CO', { maximumFractionDigits: 3 })} gal`; }

type CuadreData = {
  turno_id: string; ventas_esperadas: number;
  efectivo: number; tarjetas_credito: number; tarjetas_debito: number;
  transferencias: number; qr: number; credito_empresas: number; otros: number;
  total_entregado: number; diferencia: number; resultado: string;
  observaciones_cuadre: string | null;
};

const ESTADO_CONF = {
  abierto: { label: 'En curso', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  pendiente_aprobacion: { label: 'Pendiente de aprobación', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  en_revision: { label: 'En revisión', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  cerrado: { label: 'Cerrado', dot: 'bg-slate-400', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
  con_diferencia: { label: 'Con diferencia', dot: 'bg-red-500', bg: 'bg-red-50 text-red-800 border-red-200' },
};

interface Props {
  turno: Turno;
  lecturas: Lectura[];
  estacion: Estacion;
  surtidores: Surtidor[];
  onEntregado: () => void;
  onVolver: () => void;
}

export function EstEntregaTurno({ turno, lecturas, estacion, surtidores, onEntregado, onVolver }: Props) {
  const [cuadre, setCuadre] = useState<CuadreData | null>(null);
  const [loadingCuadre, setLoadingCuadre] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [firmaSupervisor, setFirmaSupervisor] = useState('');

  useEffect(() => {
    supabase.from('est_cuadres').select('*').eq('turno_id', turno.id).maybeSingle()
      .then(({ data }) => { setCuadre(data as CuadreData | null); setLoadingCuadre(false); });
  }, [turno.id]);

  /* ── Computed summaries ─────────────────────────── */
  const totalGalones = lecturas.reduce((s, l) => s + (l.litros_vendidos ?? 0), 0);
  const totalVentas = lecturas.reduce((s, l) => s + (l.venta_total ?? 0), 0);
  const manguerasUsadas = lecturas.filter((l) => (l.litros_vendidos ?? 0) > 0).length;
  const surtidoresUsados = new Set(lecturas.filter((l) => (l.litros_vendidos ?? 0) > 0).map((l) => l.surtidor_id)).size;
  const productosUsados = new Set(lecturas.filter((l) => (l.litros_vendidos ?? 0) > 0 && l.producto_id).map((l) => l.producto_id)).size;

  const byProduct = Object.values(
    lecturas.reduce<Record<string, { nombre: string; color: string; galones: number; venta: number; precio: number }>>((acc, l) => {
      const key = l.nombre_producto ?? 'Sin asignar';
      if (!acc[key]) acc[key] = { nombre: key, color: l.color_producto, galones: 0, venta: 0, precio: l.precio_litro };
      acc[key].galones += l.litros_vendidos ?? 0;
      acc[key].venta += l.venta_total ?? 0;
      return acc;
    }, {})
  ).filter((p) => p.galones > 0);

  const bySurtidor = Object.values(
    lecturas.reduce<Record<string, { nombre: string; mangueras: number; galones: number; venta: number }>>((acc, l) => {
      const key = l.surtidor_id;
      const nom = surtidores.find((s) => s.id === l.surtidor_id)?.nombre ?? l.nombre_surtidor;
      if (!acc[key]) acc[key] = { nombre: nom, mangueras: 0, galones: 0, venta: 0 };
      acc[key].mangueras++;
      acc[key].galones += l.litros_vendidos ?? 0;
      acc[key].venta += l.venta_total ?? 0;
      return acc;
    }, {})
  );

  const hasFinals = lecturas.every((l) => l.lectura_final !== null);
  const estadoConf = ESTADO_CONF[turno.estado as keyof typeof ESTADO_CONF] ?? ESTADO_CONF.abierto;

  const handleEntregar = async () => {
    if (!cuadre) { toast.error('Completa primero el cuadre de caja antes de entregar el turno.'); return; }
    if (!hasFinals) { toast.error('Faltan lecturas finales. Vuelve a la sección de Operación.'); return; }
    setSubmitting(true);
    try {
      await supabase.from('est_turnos').update({
        estado: 'pendiente_aprobacion',
        hora_fin_real: turno.hora_fin_real ?? new Date().toTimeString().slice(0, 5),
        total_litros: totalGalones, total_ventas: totalVentas,
      }).eq('id', turno.id);
      toast.success('Turno entregado al supervisor. Pendiente de aprobación.');
      onEntregado();
    } catch (err) { toast.error('Error al entregar el turno.'); console.error(err); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Document header */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30">
              <Fuel className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Documento de Entrega</p>
              <h2 className="text-2xl font-extrabold text-white">Entrega de Turno</h2>
              <p className="text-sm text-slate-300">{estacion.nombre}{estacion.ciudad ? ` — ${estacion.ciudad}` : ''}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={cn('inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-bold', estadoConf.bg)}>
              <span className={cn('h-2 w-2 rounded-full', estadoConf.dot)} />
              {estadoConf.label}
            </span>
            <p className="text-xs text-slate-400">{turno.fecha}</p>
          </div>
        </div>
      </div>

      {/* Revision warning */}
      {turno.estado === 'en_revision' && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-300/60 bg-blue-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-bold text-blue-800">El supervisor solicitó revisión</p>
            {(turno as Turno & { supervisor_observaciones?: string }).supervisor_observaciones && (
              <p className="mt-1 text-sm text-blue-700">"{(turno as Turno & { supervisor_observaciones?: string }).supervisor_observaciones}"</p>
            )}
            <Button size="sm" variant="outline" className="mt-2 gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-100" onClick={onVolver}>
              <RotateCcw className="h-3 w-3" />Corregir cuadre
            </Button>
          </div>
        </div>
      )}

      {/* Employee info */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Empleado', value: turno.empleado, icon: User },
          { label: 'Cargo', value: turno.cargo ?? '—', icon: Award },
          { label: 'Turno', value: TURNO_MAP[turno.tipo_turno] ?? turno.tipo_turno, icon: Clock },
          { label: 'Fecha', value: turno.fecha, icon: Clock },
          { label: 'Inicio', value: turno.hora_inicio, icon: Clock },
          { label: 'Fin estimado', value: turno.hora_fin_estimada ?? '—', icon: Clock },
        ].map((f) => (
          <div key={f.label} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{f.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-900 truncate">{f.value}</p>
          </div>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Total galones', value: fmtGal(totalGalones), icon: Droplet, color: 'text-blue-600 bg-blue-50' },
          { label: 'Venta total', value: fmt(totalVentas), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Mangueras activas', value: String(manguerasUsadas), icon: Gauge, color: 'text-violet-600 bg-violet-50' },
          { label: 'Surtidores usados', value: String(surtidoresUsados), icon: Fuel, color: 'text-amber-600 bg-amber-50' },
          { label: 'Productos vendidos', value: String(productosUsados), icon: Package, color: 'text-teal-600 bg-teal-50' },
        ].map((k) => (
          <Card key={k.label} className="p-4">
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', k.color)}><k.icon className="h-4 w-4" /></div>
            <p className="mt-3 text-xl font-extrabold text-slate-900">{k.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{k.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Product summary */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3"><p className="text-sm font-bold text-slate-900">Resumen por producto</p></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-100">
                {['Producto', 'Galones', 'Precio/gal', 'Venta'].map((h) => <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {byProduct.map((p) => (
                  <tr key={p.nombre} className="hover:bg-slate-50/40">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: p.color }} /><span className="text-sm font-medium text-slate-900">{p.nombre}</span></div></td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-700">{fmtGal(p.galones)}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{fmt(p.precio)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-900">{fmt(p.venta)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50/80">
                <td className="px-4 py-2 text-xs font-bold text-slate-600">TOTAL</td>
                <td className="px-4 py-2 text-xs font-bold text-blue-700">{fmtGal(totalGalones)}</td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2 text-xs font-bold text-slate-900">{fmt(totalVentas)}</td>
              </tr></tfoot>
            </table>
          </div>
        </Card>

        {/* Surtidor cards */}
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3"><p className="text-sm font-bold text-slate-900">Resumen por surtidor</p></div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {bySurtidor.map((s) => (
              <div key={s.nombre} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white text-xs font-bold mb-2">S</div>
                <p className="text-xs font-bold text-slate-900 truncate">{s.nombre}</p>
                <p className="mt-1 text-lg font-extrabold text-blue-700">{fmtGal(s.galones)}</p>
                <p className="text-xs font-semibold text-slate-700">{fmt(s.venta)}</p>
                <p className="mt-1 text-[10px] text-slate-400">{s.mangueras} mangueras</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Manguera detail table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3"><p className="text-sm font-bold text-slate-900">Detalle por manguera</p></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              {['Manguera', 'Producto', 'Inicial', 'Final', 'Galones', 'Precio/gal', 'Venta'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {lecturas.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/40">
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-full text-white text-[9px] font-bold" style={{ background: l.color_producto }}>M{l.numero_manguera}</div><span className="text-xs font-medium text-slate-800">{l.nombre_manguera}</span></div></td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{l.nombre_producto ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{l.lectura_inicial?.toFixed(3) ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{l.lectura_final?.toFixed(3) ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-blue-700">{l.litros_vendidos !== null ? fmtGal(l.litros_vendidos) : '—'}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{fmt(l.precio_litro)}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-slate-900">{l.venta_total !== null ? fmt(l.venta_total) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Cuadre de caja */}
      {loadingCuadre ? <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div> : cuadre ? (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3"><p className="text-sm font-bold text-slate-900">Dinero entregado</p></div>
          <div className="p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(METODO_LABELS).map(([k, label]) => (
                cuadre[k as keyof CuadreData] as number > 0 && (
                  <div key={k} className="rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] text-slate-500">{label}</p>
                    <p className="text-sm font-bold text-slate-900">{fmt(cuadre[k as keyof CuadreData] as number)}</p>
                  </div>
                )
              ))}
              <div className="rounded-xl bg-slate-900 p-3 col-span-2 sm:col-span-2">
                <p className="text-[10px] text-slate-400">Total entregado</p>
                <p className="text-lg font-extrabold text-white">{fmt(cuadre.total_entregado)}</p>
              </div>
            </div>

            {/* Result */}
            <div className={cn('mt-4 flex items-center gap-4 rounded-2xl border-2 p-4', cuadre.resultado === 'correcto' ? 'border-emerald-300 bg-emerald-50' : cuadre.resultado === 'sobrante' ? 'border-blue-300 bg-blue-50' : 'border-red-300 bg-red-50')}>
              {cuadre.resultado === 'correcto' ? <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" /> : cuadre.resultado === 'sobrante' ? <TrendingUp className="h-8 w-8 text-blue-600 shrink-0" /> : <XCircle className="h-8 w-8 text-red-600 shrink-0" />}
              <div className="flex-1">
                <p className={cn('font-extrabold', cuadre.resultado === 'correcto' ? 'text-emerald-800' : cuadre.resultado === 'sobrante' ? 'text-blue-800' : 'text-red-800')}>
                  {cuadre.resultado === 'correcto' ? 'Cuadre Correcto' : cuadre.resultado === 'sobrante' ? 'Sobrante de caja' : 'Faltante de caja'}
                </p>
                {cuadre.resultado !== 'correcto' && <p className={cn('text-2xl font-extrabold', cuadre.resultado === 'sobrante' ? 'text-blue-700' : 'text-red-700')}>{fmt(Math.abs(cuadre.diferencia))}</p>}
              </div>
              <div className="text-right text-sm text-slate-600">
                <p>Esperado: <span className="font-bold text-slate-900">{fmt(cuadre.ventas_esperadas)}</span></p>
                <p>Entregado: <span className="font-bold text-slate-900">{fmt(cuadre.total_entregado)}</span></p>
              </div>
            </div>
            {cuadre.observaciones_cuadre && <p className="mt-3 text-sm text-slate-600 italic">Observación: "{cuadre.observaciones_cuadre}"</p>}
          </div>
        </Card>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800">No se ha completado el cuadre de caja. Dirígete a "Cuadre de Caja" para completarlo.</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-5">
        {[{ label: 'Firma del vendedor', name: turno.empleado }, { label: 'Firma del supervisor', input: true }].map((f, i) => (
          <div key={i} className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center">
            <PenLine className="mx-auto mb-3 h-6 w-6 text-slate-300" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{f.label}</p>
            {f.input ? (
              <Input value={firmaSupervisor} onChange={(e) => setFirmaSupervisor(e.target.value)} placeholder="Nombre del supervisor" className="text-center text-sm" />
            ) : (
              <p className="text-sm font-semibold text-slate-700">{f.name}</p>
            )}
            <div className="mt-3 h-0.5 w-full bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Actions */}
      {turno.estado === 'abierto' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">¿Todo está correcto?</p>
            <p className="text-xs text-slate-500">Al entregar el turno, el supervisor recibirá este documento para su revisión y aprobación.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onVolver} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />Volver al cuadre
            </Button>
            <Button onClick={handleEntregar} disabled={submitting || !cuadre || !hasFinals} className="gap-2 bg-amber-600 hover:bg-amber-700 min-w-40">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
              Entregar al supervisor
            </Button>
          </div>
        </div>
      )}
      {turno.estado === 'pendiente_aprobacion' && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50/80 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">Esperando aprobación del supervisor</p>
            <p className="text-xs text-amber-600">El turno ha sido entregado. El supervisor revisará y aprobará o solicitará revisión.</p>
          </div>
        </div>
      )}
    </div>
  );
}
