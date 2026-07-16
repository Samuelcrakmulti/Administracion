'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, Save, Clock, User, Activity, CheckCircle2,
  AlertTriangle, ChevronDown, ChevronRight, PlayCircle, XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Estacion } from './est-estaciones';
import type { Isla } from './est-islas';
import type { Surtidor } from './est-surtidores';
import type { Manguera } from './est-mangueras';
import type { Producto } from './est-productos';

export type Turno = {
  id: string; estacion_id: string; empleado: string; cargo: string | null;
  tipo_turno: string; fecha: string; hora_inicio: string; hora_fin_estimada: string | null;
  hora_fin_real: string | null; estado: string; total_litros: number | null;
  total_ventas: number | null; observaciones: string | null; created_at: string;
};

export type Lectura = {
  id: string; turno_id: string; manguera_id: string; surtidor_id: string;
  isla_id: string; producto_id: string | null; nombre_manguera: string;
  numero_manguera: number; nombre_surtidor: string; numero_surtidor: number;
  nombre_isla: string; orden_isla: number; nombre_producto: string | null;
  color_producto: string; precio_litro: number; lectura_inicial: number | null;
  lectura_final: number | null; litros_vendidos: number | null; venta_total: number | null;
};

function fmt(v: number) { return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }); }
function fmtNum(v: number | null) { return v === null ? '—' : v.toLocaleString('es-CO', { maximumFractionDigits: 3 }); }
const TURNO_LABELS: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };

interface Props {
  estacion: Estacion; islas: Isla[]; surtidores: Surtidor[];
  mangueras: Manguera[]; productos: Producto[];
  onRefresh: () => void;
  onTurnoChange: (turno: Turno | null) => void;
}

export function EstOperacion({ estacion, islas, surtidores, mangueras, productos, onRefresh, onTurnoChange }: Props) {
  const [turno, setTurno] = useState<Turno | null>(null);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fase, setFase] = useState<'iniciales' | 'finales'>('iniciales');
  const [edits, setEdits] = useState<Record<string, { inicial: string; final: string }>>({});
  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const [form, setForm] = useState({ empleado: '', cargo: '', tipo_turno: 'manana', fecha: now.toISOString().split('T')[0], hora_inicio: timeStr, hora_fin_estimada: '', observaciones: '' });

  const fetchTurno = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('est_turnos').select('*').eq('estacion_id', estacion.id).in('estado', ['abierto', 'pendiente_aprobacion', 'en_revision']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const t = data as Turno | null;
    setTurno(t); onTurnoChange(t);
    if (t) {
      const { data: lect } = await supabase.from('est_lecturas').select('*').eq('turno_id', t.id).order('orden_isla').order('numero_surtidor').order('numero_manguera');
      const ls = (lect as Lectura[]) ?? [];
      setLecturas(ls);
      const hasAllInit = ls.every((l) => l.lectura_inicial !== null);
      setFase(hasAllInit ? 'finales' : 'iniciales');
      // Init edit map from DB values
      const initEdits: Record<string, { inicial: string; final: string }> = {};
      ls.forEach((l) => { initEdits[l.id] = { inicial: l.lectura_inicial?.toString() ?? '', final: l.lectura_final?.toString() ?? '' }; });
      setEdits(initEdits);
    } else { setLecturas([]); setEdits({}); }
    setLoading(false);
  }, [estacion.id, onTurnoChange]);

  useEffect(() => { fetchTurno(); }, [fetchTurno]);

  const setEdit = (id: string, field: 'inicial' | 'final', val: string) => {
    setEdits((p) => ({ ...p, [id]: { ...p[id], [field]: val } }));
  };

  const getVal = (l: Lectura, field: 'inicial' | 'final') => {
    const e = edits[l.id];
    if (!e) return null;
    const s = field === 'inicial' ? e.inicial : e.final;
    return s === '' ? null : parseFloat(s);
  };

  const getLitros = (l: Lectura) => {
    const i = getVal(l, 'inicial') ?? l.lectura_inicial;
    const f = getVal(l, 'final') ?? l.lectura_final;
    if (i === null || f === null) return null;
    return Math.max(0, f - i);
  };

  const getVenta = (l: Lectura) => { const lit = getLitros(l); return lit === null ? null : lit * l.precio_litro; };

  const handleCreateTurno = async () => {
    if (!form.empleado.trim()) { toast.error('El nombre del empleado es obligatorio.'); return; }
    if (mangueras.length === 0) { toast.error('Esta estación no tiene mangueras configuradas.'); return; }
    setSaving(true);
    try {
      const { data: newTurno, error: tErr } = await supabase.from('est_turnos').insert({ ...form, estacion_id: estacion.id }).select().single();
      if (tErr) throw tErr;
      const rows = mangueras.map((m) => {
        const surt = surtidores.find((s) => s.id === m.surtidor_id);
        const isla = islas.find((i) => i.id === m.isla_id);
        const prod = productos.find((p) => p.id === m.producto_id);
        return {
          turno_id: newTurno.id, manguera_id: m.id, surtidor_id: m.surtidor_id,
          isla_id: m.isla_id, estacion_id: estacion.id, producto_id: m.producto_id,
          nombre_manguera: m.nombre, numero_manguera: m.numero,
          nombre_surtidor: surt?.nombre ?? '', numero_surtidor: surt?.numero ?? 1,
          nombre_isla: isla?.nombre ?? '', orden_isla: isla?.orden ?? 1,
          nombre_producto: prod?.nombre ?? null,
          color_producto: prod?.color ?? m.color ?? '#94a3b8',
          precio_litro: prod?.precio_litro ?? 0,
        };
      });
      const { error: lErr } = await supabase.from('est_lecturas').insert(rows);
      if (lErr) throw lErr;
      toast.success(`Turno iniciado — ${mangueras.length} mangueras cargadas automáticamente.`);
      setShowForm(false); fetchTurno();
    } catch (err) { toast.error('Error al crear el turno.'); console.error(err); }
    finally { setSaving(false); }
  };

  const handleSaveIniciales = async () => {
    const errors: string[] = [];
    lecturas.forEach((l) => {
      const v = getVal(l, 'inicial') ?? l.lectura_inicial;
      if (v === null || v < 0) errors.push(`${l.nombre_surtidor} · ${l.nombre_manguera}`);
    });
    if (errors.length > 0) { toast.error(`Corrige las iniciales: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '…' : ''}`); return; }
    setSaving(true);
    try {
      await Promise.all(lecturas.map((l) => {
        const val = getVal(l, 'inicial') ?? l.lectura_inicial;
        return supabase.from('est_lecturas').update({ lectura_inicial: val }).eq('id', l.id);
      }));
      toast.success('Lecturas iniciales guardadas.');
      setFase('finales'); fetchTurno();
    } catch (err) { toast.error('Error al guardar.'); }
    finally { setSaving(false); }
  };

  const handleSaveFinales = async () => {
    const errors: string[] = [];
    lecturas.forEach((l) => {
      const i = getVal(l, 'inicial') ?? l.lectura_inicial;
      const f = getVal(l, 'final') ?? l.lectura_final;
      if (f === null || f < 0) errors.push(`${l.nombre_manguera} (final vacío)`);
      else if (i !== null && f < i) errors.push(`${l.nombre_manguera} (final < inicial)`);
    });
    if (errors.length > 0) { toast.error(`Corrige las finales: ${errors.slice(0, 3).join(', ')}`); return; }
    setSaving(true);
    try {
      await Promise.all(lecturas.map((l) => {
        const i = getVal(l, 'inicial') ?? l.lectura_inicial ?? 0;
        const f = getVal(l, 'final') ?? l.lectura_final ?? 0;
        const litros = Math.max(0, f - i);
        const venta = litros * l.precio_litro;
        return supabase.from('est_lecturas').update({ lectura_final: f, litros_vendidos: litros, venta_total: venta }).eq('id', l.id);
      }));
      toast.success('Lecturas finales guardadas. Ya puedes proceder al cuadre.');
      fetchTurno();
    } catch (err) { toast.error('Error al guardar finales.'); }
    finally { setSaving(false); }
  };

  // Group lecturas by isla → surtidor
  const groups = Array.from(new Set(lecturas.map((l) => l.orden_isla + '|' + l.nombre_isla)))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((key) => {
      const [, islaNombre] = key.split('|');
      const islaLects = lecturas.filter((l) => l.nombre_isla === islaNombre);
      const islaColor = islas.find((i) => i.nombre === islaNombre)?.color ?? '#3b82f6';
      const surtGrupos = Array.from(new Set(islaLects.map((l) => l.numero_surtidor + '|' + l.nombre_surtidor)))
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map((sk) => {
          const [, surtNom] = sk.split('|');
          return { surtNom, lecturas: islaLects.filter((l) => l.nombre_surtidor === surtNom).sort((a, b) => a.numero_manguera - b.numero_manguera) };
        });
      return { islaNombre, islaColor, surtGrupos };
    });

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Operación Diaria — {estacion.nombre}</h2>
          <p className="text-sm text-slate-500">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        {!turno && !showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-amber-600 hover:bg-amber-700"><PlayCircle className="h-4 w-4" />Iniciar turno</Button>
        )}
      </div>

      {/* No active turn */}
      {!turno && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 py-16 text-center">
          <Clock className="h-14 w-14 text-amber-300" />
          <h3 className="mt-4 text-base font-bold text-slate-700">No hay turno activo</h3>
          <p className="mt-1 text-sm text-slate-400">Inicia un nuevo turno para comenzar a registrar lecturas.</p>
          <Button onClick={() => setShowForm(true)} className="mt-5 gap-2 bg-amber-600 hover:bg-amber-700"><PlayCircle className="h-4 w-4" />Iniciar turno</Button>
        </div>
      )}

      {/* Turn creation form */}
      {showForm && !turno && (
        <Card className="p-6">
          <h3 className="mb-4 text-sm font-bold text-slate-900 flex items-center gap-2"><PlayCircle className="h-4 w-4 text-amber-600" />Nuevo turno</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="col-span-2 space-y-1.5 md:col-span-1">
              <Label className="text-xs font-semibold text-slate-600">Empleado *</Label>
              <Input value={form.empleado} onChange={(e) => setForm((p) => ({ ...p, empleado: e.target.value }))} placeholder="Nombre del vendedor" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Cargo</Label>
              <Input value={form.cargo} onChange={(e) => setForm((p) => ({ ...p, cargo: e.target.value }))} placeholder="Despachador" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Turno</Label>
              <Select value={form.tipo_turno} onValueChange={(v) => setForm((p) => ({ ...p, tipo_turno: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manana">Mañana</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noche">Noche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Hora inicio</Label>
              <Input type="time" value={form.hora_inicio} onChange={(e) => setForm((p) => ({ ...p, hora_inicio: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Hora fin estimada</Label>
              <Input type="time" value={form.hora_fin_estimada} onChange={(e) => setForm((p) => ({ ...p, hora_fin_estimada: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5 md:col-span-3">
              <Label className="text-xs font-semibold text-slate-600">Observaciones</Label>
              <Input value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-blue-200/60 bg-blue-50/50 p-3 text-xs text-blue-700">
            Se cargarán automáticamente <strong>{mangueras.length} mangueras</strong> de <strong>{islas.length} islas</strong> configuradas en esta estación.
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleCreateTurno} disabled={saving} className="gap-2 bg-amber-600 hover:bg-amber-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}Iniciar turno
            </Button>
          </div>
        </Card>
      )}

      {/* Active turn */}
      {turno && (
        <>
          {/* Turn status bar */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white"><User className="h-4 w-4" /></div>
              <div>
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">{TURNO_LABELS[turno.tipo_turno]} — Turno activo</p>
                <p className="text-sm font-bold text-slate-900">{turno.empleado}{turno.cargo ? ` · ${turno.cargo}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              {turno.fecha} desde {turno.hora_inicio}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Turno activo
              </span>
            </div>
          </div>

          {/* Phase tabs */}
          <div className="flex gap-2">
            {(['iniciales', 'finales'] as const).map((f, i) => (
              <button key={f} onClick={() => setFase(f)}
                className={cn('flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all', fase === f ? 'bg-amber-600 text-white shadow-md' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold', fase === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500')}>{i + 1}</span>
                {f === 'iniciales' ? 'Lecturas Iniciales' : 'Lecturas Finales'}
              </button>
            ))}
          </div>

          {/* Readings table */}
          <div className="space-y-5">
            {groups.map((grupo) => (
              <div key={grupo.islaNombre} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Island header */}
                <div className="flex items-center gap-3 px-5 py-3 text-white font-bold text-sm" style={{ background: grupo.islaColor }}>
                  <span>{grupo.islaNombre}</span>
                </div>

                {grupo.surtGrupos.map((sg) => (
                  <div key={sg.surtNom}>
                    {/* Surtidor header */}
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-900 px-5 py-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-900 text-xs font-extrabold">S</div>
                      <span className="text-sm font-semibold text-white">{sg.surtNom}</span>
                      <span className="ml-auto text-xs text-slate-400">{sg.lecturas.length} mangueras</span>
                    </div>

                    {/* Readings rows */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Manguera</th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Producto</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Precio/gal</th>
                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-amber-600">Inicial</th>
                            {fase === 'finales' && <>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-blue-600">Final</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">Galones</th>
                              <th className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">Venta</th>
                            </>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {sg.lecturas.map((l) => {
                            const eInit = edits[l.id]?.inicial ?? (l.lectura_inicial?.toString() ?? '');
                            const eFinal = edits[l.id]?.final ?? (l.lectura_final?.toString() ?? '');
                            const i = parseFloat(eInit) || null;
                            const f = fase === 'finales' ? (parseFloat(eFinal) || null) : null;
                            const litros = i !== null && f !== null ? Math.max(0, f - i) : null;
                            const venta = litros !== null ? litros * l.precio_litro : null;
                            const hasError = fase === 'finales' && f !== null && i !== null && f < i;
                            return (
                              <tr key={l.id} className={cn('hover:bg-slate-50/50 transition-colors', hasError && 'bg-red-50/50')}>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-white text-[10px] font-bold shadow-sm" style={{ background: l.color_producto }}>M{l.numero_manguera}</div>
                                    <span className="text-sm font-medium text-slate-900">{l.nombre_manguera}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full" style={{ background: l.color_producto }} />
                                    <span className="text-sm text-slate-700">{l.nombre_producto ?? 'Sin asignar'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right text-xs font-mono text-slate-500">{fmt(l.precio_litro)}</td>
                                <td className="px-4 py-3">
                                  <Input type="number" min={0} step={0.001} value={eInit}
                                    onChange={(e) => setEdit(l.id, 'inicial', e.target.value)}
                                    className="w-32 text-right font-mono text-sm"
                                    placeholder="0.000" />
                                </td>
                                {fase === 'finales' && <>
                                  <td className="px-4 py-3">
                                    <Input type="number" min={0} step={0.001} value={eFinal}
                                      onChange={(e) => setEdit(l.id, 'final', e.target.value)}
                                      className={cn('w-32 text-right font-mono text-sm', hasError && 'border-red-400 focus:ring-red-400')}
                                      placeholder="0.000" />
                                    {hasError && <p className="mt-0.5 text-[10px] text-red-500">Final &lt; Inicial</p>}
                                  </td>
                                  <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-emerald-700">{litros !== null ? `${litros.toFixed(3)} gal` : '—'}</td>
                                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-slate-900">{venta !== null ? fmt(venta) : '—'}</td>
                                </>}
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Surtidor subtotal */}
                        {fase === 'finales' && (
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50/80">
                              <td colSpan={4} className="px-4 py-2 text-right text-xs font-bold text-slate-500">Subtotal {sg.surtNom}:</td>
                              <td className="px-4 py-2" />
                              <td className="px-4 py-2 text-right text-xs font-bold text-emerald-700">
                                {sg.lecturas.reduce((s, l) => { const lit = getLitros(l); return s + (lit ?? 0); }, 0).toFixed(3)} gal
                              </td>
                              <td className="px-4 py-2 text-right text-xs font-bold text-slate-900">
                                {fmt(sg.lecturas.reduce((s, l) => { const v = getVenta(l); return s + (v ?? 0); }, 0))}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Totals + actions */}
          {lecturas.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-5 text-white">
              {fase === 'finales' && (
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-emerald-400">{lecturas.reduce((s, l) => s + (getLitros(l) ?? 0), 0).toFixed(3)} gal</p>
                    <p className="text-xs text-slate-400">Total galones</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-extrabold text-white">{fmt(lecturas.reduce((s, l) => s + (getVenta(l) ?? 0), 0))}</p>
                    <p className="text-xs text-slate-400">Total ventas</p>
                  </div>
                </div>
              )}
              <div className="ml-auto flex gap-3">
                {fase === 'iniciales' && (
                  <Button onClick={handleSaveIniciales} disabled={saving} className="gap-2 bg-amber-500 hover:bg-amber-600">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar iniciales
                  </Button>
                )}
                {fase === 'finales' && (
                  <Button onClick={handleSaveFinales} disabled={saving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Guardar finales
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
