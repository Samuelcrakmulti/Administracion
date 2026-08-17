'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, Save, Fuel, AlertTriangle, CheckCircle2, Layers, Gauge, Droplet,
  ArrowDownToLine, Edit3, X, Warning, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Estacion } from './est-estaciones';
import type { Cierre } from './est-cierre-detalle';

export type Isla = { id: string; nombre: string; orden: number; estado: string };
export type Surtidor = { id: string; isla_id: string; numero: number; nombre: string; estado: string };
export type Manguera = {
  id: string; surtidor_id: string; isla_id: string; estacion_id: string;
  numero: number; nombre: string; producto_id: string | null; estado: string; color: string;
};
export type Producto = { id: string; nombre: string; color: string; codigo: string | null };
type Lectura = {
  id: string;
  manguera_id: string;
  lectura_inicial: number | null;
  lectura_final: number | null;
  galones_vendidos: number | null;
  inicial_heredada: boolean;
  inicial_modificada: boolean;
  motivo_modificacion_inicial: string | null;
  estado: string;
};

interface Props {
  cierre: Cierre;
  estacion: Estacion;
  islas: Isla[];
  surtidores: Surtidor[];
  mangueras: Manguera[];
  productos: Producto[];
  readOnly: boolean;
  onLecturasChange: (completas: number, total: number, inconsistencias: number) => void;
}

function fmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '';
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function parseNum(s: string): number | null {
  const cleaned = s.replace(/\./g, '').replace(',', '.').trim();
  if (cleaned === '') return null;
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export function EstCierreLecturas({
  cierre, estacion, islas, surtidores, mangueras, productos, readOnly, onLecturasChange,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lecturas, setLecturas] = useState<Record<string, Lectura>>({});
  const [editedFields, setEditedFields] = useState<Record<string, { inicial?: number | null; final?: number | null }>>({});
  const [showEditInicial, setShowEditInicial] = useState<string | null>(null);
  const [editMotivo, setEditMotivo] = useState('');
  const [editValue, setEditValue] = useState('');
  const [expandedIslands, setExpandedIslands] = useState<Set<string>>(new Set());

  const productoMap = useMemo(() => {
    const m: Record<string, Producto> = {};
    productos.forEach((p) => { m[p.id] = p; });
    return m;
  }, [productos]);

  const manguerasActivas = useMemo(() => mangueras.filter((m) => m.estado === 'activo'), [mangueras]);
  const islasOrdenadas = useMemo(() => [...islas].sort((a, b) => a.orden - b.orden), [islas]);
  const surtidoresPorIsla = useCallback((islaId: string) => surtidores.filter((s) => s.isla_id === islaId).sort((a, b) => a.numero - b.numero), [surtidores]);
  const manguerasPorSurtidor = useCallback((surId: string) => manguerasActivas.filter((m) => m.surtidor_id === surId).sort((a, b) => a.numero - b.numero), [manguerasActivas]);

  // Fetch existing lecturas for this cierre
  const fetchLecturas = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('est_lecturas')
      .select('*')
      .eq('cierre_id', cierre.id);
    const map: Record<string, Lectura> = {};
    (data as Lectura[] | null)?.forEach((l) => { map[l.manguera_id] = l; });
    setLecturas(map);
    setLoading(false);
  }, [cierre.id]);

  // Fetch initial from previous turno for each manguera
  const fetchInicialesPrevias = useCallback(async () => {
    if (manguerasActivas.length === 0) return;

    // Find the previous cierre for this station (before current fecha)
    const { data: prevCierres } = await supabase
      .from('est_cierres')
      .select('id, fecha, turno_label')
      .eq('estacion_id', estacion.id)
      .lt('fecha', cierre.fecha)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (!prevCierres || prevCierres.length === 0) return;
    const prevCierreId = prevCierres[0].id;

    // Get lecturas from previous cierre
    const { data: prevLecturas } = await supabase
      .from('est_lecturas')
      .select('manguera_id, lectura_final')
      .eq('cierre_id', prevCierreId)
      .not('lectura_final', 'is', null);

    if (!prevLecturas) return;

    const finalesPrevios: Record<string, number> = {};
    prevLecturas.forEach((l: { manguera_id: string; lectura_final: number | null }) => {
      if (l.lectura_final !== null) finalesPrevios[l.manguera_id] = l.lectura_final;
    });

    // Apply to lecturas that don't have inicial yet
    setLecturas((prev) => {
      const next = { ...prev };
      manguerasActivas.forEach((mang) => {
        const existing = next[mang.id];
        if (!existing || existing.lectura_inicial === null) {
          if (finalesPrevios[mang.id] !== undefined) {
            next[mang.id] = {
              id: existing?.id ?? '',
              manguera_id: mang.id,
              lectura_inicial: finalesPrevios[mang.id],
              lectura_final: existing?.lectura_final ?? null,
              galones_vendidos: existing?.galones_vendidos ?? null,
              inicial_heredada: true,
              inicial_modificada: false,
              motivo_modificacion_inicial: null,
              estado: existing?.estado ?? 'incompleta',
            };
          }
        }
      });
      return next;
    });
  }, [manguerasActivas, estacion.id, cierre.fecha]);

  useEffect(() => {
    fetchLecturas().then(() => fetchInicialesPrevias());
  }, [fetchLecturas, fetchInicialesPrevias]);

  // Expand all islands by default on first load
  useEffect(() => {
    if (islasOrdenadas.length > 0 && expandedIslands.size === 0) {
      setExpandedIslands(new Set(islasOrdenadas.map((i) => i.id)));
    }
  }, [islasOrdenada, expandedIslands.size]);

  // Notify parent of completeness
  useEffect(() => {
    let completas = 0;
    let inconsistencias = 0;
    manguerasActivas.forEach((m) => {
      const l = lecturas[m.id];
      if (l && l.lectura_inicial !== null && l.lectura_final !== null) {
        completas++;
        if (l.lectura_final < l.lectura_inicial) inconsistencias++;
      }
    });
    onLecturasChange(completas, manguerasActivas.length, inconsistencias);
  }, [lecturas, manguerasActivas, onLecturasChange]);

  const calcGalones = (inicial: number | null, final: number | null): number | null => {
    if (inicial === null || final === null) return null;
    return parseFloat((final - inicial).toFixed(3));
  };

  const handleFinalChange = (mangueraId: string, value: string) => {
    const numVal = parseNum(value);
    setEditedFields((p) => ({ ...p, [mangueraId]: { ...p[mangueraId], final: numVal } }));
    setLecturas((prev) => {
      const existing = prev[mangueraId];
      const inicial = existing?.lectura_inicial ?? null;
      const galones = calcGalones(inicial, numVal);
      const estado = (inicial !== null && numVal !== null)
        ? (numVal < inicial ? 'inconsistente' : 'completa')
        : 'incompleta';
      return {
        ...prev,
        [mangueraId]: {
          id: existing?.id ?? '',
          manguera_id: mangueraId,
          lectura_inicial: inicial,
          lectura_final: numVal,
          galones_vendidos: galones,
          inicial_heredada: existing?.inicial_heredada ?? true,
          inicial_modificada: existing?.inicial_modificada ?? false,
          motivo_modificacion_inicial: existing?.motivo_modificacion_inicial ?? null,
          estado,
        },
      };
    });
  };

  const handleEditInicial = (mangueraId: string) => {
    const current = lecturas[mangueraId];
    setEditValue(current?.lectura_inicial !== null && current?.lectura_inicial !== undefined ? fmt(current.lectura_inicial) : '');
    setEditMotivo('');
    setShowEditInicial(mangueraId);
  };

  const confirmEditInicial = async () => {
    if (!showEditInicial) return;
    if (!editMotivo.trim()) { toast.error('Debes proporcionar un motivo para modificar la lectura inicial.'); return; }
    const mangueraId = showEditInicial;
    const newVal = parseNum(editValue);
    const oldVal = lecturas[mangueraId]?.lectura_inicial ?? null;

    setLecturas((prev) => {
      const existing = prev[mangueraId];
      const galones = calcGalones(newVal, existing?.lectura_final ?? null);
      return {
        ...prev,
        [mangueraId]: {
          ...existing,
          lectura_inicial: newVal,
          galones_vendidos: galones,
          inicial_modificada: true,
          motivo_modificacion_inicial: editMotivo,
          estado: (newVal !== null && existing?.lectura_final !== null)
            ? (existing.lectura_final! < newVal ? 'inconsistente' : 'completa')
            : 'incompleta',
        },
      };
    });
    setEditedFields((p) => ({ ...p, [mangueraId]: { ...p[mangueraId], inicial: newVal } }));

    // Audit the change
    if (lecturas[mangueraId]?.id) {
      await supabase.from('est_lectura_auditoria').insert({
        lectura_id: lecturas[mangueraId].id,
        cierre_id: cierre.id,
        campo_modificado: 'lectura_inicial',
        valor_anterior: oldVal?.toString() ?? 'null',
        valor_nuevo: newVal?.toString() ?? 'null',
        usuario: user?.email ?? 'Sistema',
        motivo: editMotivo,
      });
    }

    setShowEditInicial(null);
    toast.success('Lectura inicial modificada. Motivo registrado en auditoría.');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upserts: Record<string, unknown>[] = [];
      for (const mang of manguerasActivas) {
        const l = lecturas[mang.id];
        if (!l) continue;
        if (l.lectura_inicial === null && l.lectura_final === null) continue;

        const producto = mang.producto_id ? productoMap[mang.producto_id] : null;
        const surtidor = surtidores.find((s) => s.id === mang.surtidor_id);
        const isla = islas.find((i) => i.id === mang.isla_id);

        const row: Record<string, unknown> = {
          id: l.id || undefined,
          cierre_id: cierre.id,
          turno_id: cierre.turno_id,
          manguera_id: mang.id,
          surtidor_id: mang.surtidor_id,
          isla_id: mang.isla_id,
          estacion_id: estacion.id,
          producto_id: mang.producto_id,
          nombre_manguera: mang.nombre,
          numero_manguera: mang.numero,
          nombre_surtidor: surtidor?.nombre ?? '',
          numero_surtidor: surtidor?.numero ?? 1,
          nombre_isla: isla?.nombre ?? '',
          orden_isla: isla?.orden ?? 1,
          nombre_producto: producto?.nombre ?? null,
          color_producto: producto?.color ?? mang.color ?? '#94a3b8',
          precio_litro: 0,
          lectura_inicial: l.lectura_inicial,
          lectura_final: l.lectura_final,
          galones_vendidos: l.galones_vendidos,
          litros_vendidos: l.galones_vendidos,
          inicial_heredada: l.inicial_heredada,
          inicial_modificada: l.inicial_modificada,
          motivo_modificacion_inicial: l.motivo_modificacion_inicial,
          estado: l.estado,
          updated_by: user?.email ?? null,
          updated_at: new Date().toISOString(),
        };
        upserts.push(row);
      }

      if (upserts.length === 0) {
        toast.info('No hay lecturas para guardar.');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('est_lecturas')
        .upsert(upserts, { onConflict: 'turno_id,manguera_id' });

      if (error) throw error;
      toast.success(`${upserts.length} lectura(s) guardada(s).`);
      await fetchLecturas();
      setEditedFields({});
    } catch (err) {
      toast.error('Error al guardar las lecturas.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleIsland = (id: string) => {
    setExpandedIslands((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  if (manguerasActivas.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
            <Fuel className="h-8 w-8 text-amber-300" />
          </div>
          <h3 className="mt-5 text-base font-bold text-slate-700">Sin mangueras configuradas</h3>
          <p className="mt-2 text-sm text-slate-500">Configura islas, surtidores y mangueras para esta estación antes de registrar lecturas.</p>
        </div>
      </Card>
    );
  }

  // Summary calculations
  const totalGalones = useMemo(() => {
    return Object.values(lecturas).reduce((sum, l) => sum + (l.galones_vendidos ?? 0), 0);
  }, [lecturas]);

  const galonesPorProducto = useMemo(() => {
    const m: Record<string, { nombre: string; color: string; galones: number }> = {};
    manguerasActivas.forEach((mang) => {
      const l = lecturas[mang.id];
      if (!l || !l.galones_vendidos) return;
      const prod = mang.producto_id ? productoMap[mang.producto_id] : null;
      const key = prod?.id ?? 'sin_producto';
      const nombre = prod?.nombre ?? 'Sin producto';
      const color = prod?.color ?? '#94a3b8';
      if (!m[key]) m[key] = { nombre, color, galones: 0 };
      m[key].galones += l.galones_vendidos;
    });
    return Object.values(m).sort((a, b) => b.galones - a.galones);
  }, [lecturas, manguerasActivas, productoMap]);

  const lecturasCompletas = Object.values(lecturas).filter((l) => l.lectura_inicial !== null && l.lectura_final !== null).length;
  const inconsistencias = Object.values(lecturas).filter((l) => l.lectura_inicial !== null && l.lectura_final !== null && l.lectura_final < l.lectura_inicial).length;

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="Mangueras activas" value={String(manguerasActivas.length)} icon={Droplet} color="text-blue-600 bg-blue-50" />
        <SummaryCard label="Lecturas completas" value={`${lecturasCompletas}/${manguerasActivas.length}`} icon={CheckCircle2} color="text-emerald-600 bg-emerald-50" />
        <SummaryCard label="Total galones" value={fmt(totalGalones)} icon={Fuel} color="text-amber-600 bg-amber-50" />
        <SummaryCard label="Inconsistencias" value={String(inconsistencias)} icon={AlertTriangle} color={inconsistencias > 0 ? 'text-red-600 bg-red-50' : 'text-slate-500 bg-slate-100'} />
      </div>

      {/* Galonaje by product */}
      {galonesPorProducto.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Fuel className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Galonaje por combustible</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {galonesPorProducto.map((p) => (
              <div key={p.nombre} className="rounded-xl border border-slate-100 p-3" style={{ borderLeftWidth: 3, borderLeftColor: p.color }}>
                <p className="text-xs font-semibold text-slate-500">{p.nombre}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{fmt(p.galones)} <span className="text-xs font-normal text-slate-400">gal</span></p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Lecturas input grouped by island → surtidor → manguera */}
      <div className="space-y-4">
        {islasOrdenadas.map((isla) => {
          const surts = surtidoresPorIsla(isla.id);
          if (surts.length === 0) return null;
          const expanded = expandedIslands.has(isla.id);
          const islaGalones = surts.reduce((sum, s) => {
            return sum + manguerasPorSurtidor(s.id).reduce((ss, m) => ss + (lecturas[m.id]?.galones_vendidos ?? 0), 0);
          }, 0);

          return (
            <Card key={isla.id} className="overflow-hidden">
              {/* Island header */}
              <button
                onClick={() => toggleIsland(isla.id)}
                className="flex w-full items-center justify-between bg-slate-50/80 px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-2.5">
                  {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-slate-900">{isla.nombre}</p>
                    <p className="text-xs text-slate-500">{surts.length} surtidor{surts.length !== 1 ? 'es' : ''} · {fmt(islaGalones)} gal</p>
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">{fmt(islaGalones)} gal</span>
              </button>

              {expanded && (
                <div className="divide-y divide-slate-100">
                  {surts.map((surt) => {
                    const mangs = manguerasPorSurtidor(surt.id);
                    if (mangs.length === 0) return null;
                    const surtGalones = mangs.reduce((sum, m) => sum + (lecturas[m.id]?.galones_vendidos ?? 0), 0);

                    return (
                      <div key={surt.id} className="p-5">
                        {/* Surtidor header */}
                        <div className="mb-4 flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                            <Gauge className="h-3.5 w-3.5" />
                          </div>
                          <p className="text-sm font-semibold text-slate-800">{surt.nombre}</p>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">{mangs.length} manguera{mangs.length !== 1 ? 's' : ''}</span>
                          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">{fmt(surtGalones)} gal</span>
                        </div>

                        {/* Mangueras */}
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                          {mangs.map((mang) => {
                            const l = lecturas[mang.id];
                            const producto = mang.producto_id ? productoMap[mang.producto_id] : null;
                            const inicial = l?.lectura_inicial ?? null;
                            const finalVal = l?.lectura_final ?? null;
                            const galones = l?.galones_vendidos ?? null;
                            const isInconsistent = inicial !== null && finalVal !== null && finalVal < inicial;
                            const hasEdited = editedFields[mang.id];

                            return (
                              <div
                                key={mang.id}
                                className={cn(
                                  'rounded-xl border p-4 transition-all',
                                  isInconsistent ? 'border-red-200 bg-red-50/30' : galones !== null ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-white'
                                )}
                              >
                                {/* Manguera header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: producto?.color ?? mang.color ?? '#94a3b8' }} />
                                    <span className="text-sm font-semibold text-slate-800">{mang.nombre}</span>
                                  </div>
                                  <span className="text-xs font-medium text-slate-500" style={{ color: producto?.color ?? '#64748b' }}>
                                    {producto?.nombre ?? 'Sin producto'}
                                  </span>
                                </div>

                                {/* Lectura inicial */}
                                <div className="mb-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Lectura inicial</Label>
                                    {l?.inicial_heredada && inicial !== null && (
                                      <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600">
                                        <ArrowDownToLine className="h-3 w-3" /> Heredada
                                      </span>
                                    )}
                                    {l?.inicial_modificada && (
                                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
                                        <Edit3 className="h-3 w-3" /> Modificada
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                                      {inicial !== null ? fmt(inicial) : <span className="text-slate-300 font-normal">Sin lectura</span>}
                                    </div>
                                    {!readOnly && (
                                      <button
                                        onClick={() => handleEditInicial(mang.id)}
                                        className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                                        title="Modificar lectura inicial"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Lectura final */}
                                <div className="mb-2.5">
                                  <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Lectura final</Label>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    value={finalVal !== null ? fmt(finalVal) : (editedFields[mang.id]?.final !== undefined ? '' : '')}
                                    onChange={(e) => handleFinalChange(mang.id, e.target.value)}
                                    placeholder="Digite la lectura final..."
                                    disabled={readOnly}
                                    className={cn(
                                      'font-semibold',
                                      isInconsistent && 'border-red-300 bg-red-50 text-red-700 focus:border-red-400'
                                    )}
                                  />
                                </div>

                                {/* Galones vendidos */}
                                <div className={cn(
                                  'flex items-center justify-between rounded-lg px-3 py-2',
                                  isInconsistent ? 'bg-red-100' : galones !== null ? 'bg-emerald-100' : 'bg-slate-100'
                                )}>
                                  <span className={cn(
                                    'text-xs font-semibold uppercase tracking-wide',
                                    isInconsistent ? 'text-red-700' : galones !== null ? 'text-emerald-700' : 'text-slate-500'
                                  )}>
                                    {isInconsistent ? (
                                      <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Inconsistente</span>
                                    ) : 'Galones vendidos'}
                                  </span>
                                  <span className={cn(
                                    'text-sm font-bold',
                                    isInconsistent ? 'text-red-700' : galones !== null ? 'text-emerald-700' : 'text-slate-400'
                                  )}>
                                    {galones !== null ? `${fmt(galones)} gal` : '—'}
                                  </span>
                                </div>

                                {isInconsistent && (
                                  <p className="mt-2 flex items-center gap-1.5 text-[11px] text-red-600">
                                    <Warning className="h-3 w-3 shrink-0" />
                                    La lectura final no puede ser menor que la inicial.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Save button */}
      {!readOnly && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || Object.keys(editedFields).length === 0}
            className="gap-2 bg-amber-600 hover:bg-amber-700 shadow-lg"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar lecturas {Object.keys(editedFields).length > 0 && `(${Object.keys(editedFields).length})`}
          </Button>
        </div>
      )}

      {readOnly && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center">
          <Lock className="h-3.5 w-3.5" /> Este cierre está cerrado y las lecturas no pueden modificarse.
        </p>
      )}

      {/* Edit inicial dialog */}
      <Dialog open={showEditInicial !== null} onOpenChange={(v) => { if (!v) setShowEditInicial(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <Edit3 className="h-4 w-4 text-amber-600" />
              </span>
              Modificar lectura inicial
            </DialogTitle>
            <DialogDescription>
              Estás modificando una lectura inicial heredada. Este cambio quedará registrado en auditoría.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nueva lectura inicial</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Ej: 209.699,680"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Motivo de la modificación *</Label>
              <Textarea
                value={editMotivo}
                onChange={(e) => setEditMotivo(e.target.value)}
                rows={3}
                placeholder="Ej: Corrección de lectura física, error de registro anterior..."
              />
            </div>
            {(() => {
              if (!showEditInicial) return null;
              const l = lecturas[showEditInicial];
              if (!l || !l.inicial_heredada) return null;
              return (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  <p className="font-semibold">Advertencia de continuidad</p>
                  <p className="mt-1">La inicial heredada del turno anterior era: <strong>{fmt(l.lectura_inicial)}</strong>. Si la modificas, puede generar inconsistencia de continuidad.</p>
                </div>
              );
            })()}
          </div>
          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditInicial(null)}>Cancelar</Button>
            <Button className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700" onClick={confirmEditInicial}>
              Confirmar modificación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: typeof Fuel; color: string }) {
  return (
    <Card className="p-4">
      <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2.5 text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Card>
  );
}

function Lock({ className }: { className?: string }) {
  return <span className={className}>🔒</span>;
}
