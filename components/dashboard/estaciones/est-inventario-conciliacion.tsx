'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, Save, Fuel, TrendingDown, TrendingUp, CheckCircle2, AlertTriangle,
  Database, Calendar, ShieldCheck, Lock, History,
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
import type { Tanque } from './est-tanques';
import type { Producto } from './est-productos';

type Movimiento = {
  id: string;
  tanque_id: string;
  tipo: string;
  concepto: string;
  galones: number;
  fecha: string;
};

type InventarioDiario = {
  id: string;
  tanque_id: string;
  fecha: string;
  tipo: string;
  nivel_galones: number;
  nivel_teorico_galones: number;
  diferencia_galones: number;
  estado_conciliacion: string;
  justificacion: string | null;
  aprobado: boolean;
};

function fmtGal(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

interface Props {
  estacionId: string;
  estacionNombre: string;
  tanques: Tanque[];
  productos: Producto[];
  onRefresh: () => void;
}

export function EstInventarioConciliacion({ estacionId, estacionNombre, tanques, productos, onRefresh }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [inventarioDiario, setInventarioDiario] = useState<InventarioDiario[]>([]);
  const [tolerancia, setTolerancia] = useState(20);
  const [nivelFisico, setNivelFisico] = useState<Record<string, string>>({});
  const [justificacion, setJustificacion] = useState<Record<string, string>>({});
  const [conciliacionGuardada, setConciliacionGuardada] = useState(false);

  const getProducto = (id: string | null) => productos.find((p) => p.id === id);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [movRes, invRes, tolRes] = await Promise.all([
      supabase.from('est_movimientos_inventario').select('*').eq('estacion_id', estacionId).eq('fecha', fecha),
      supabase.from('est_inventario_diario').select('*').eq('estacion_id', estacionId).eq('fecha', fecha),
      supabase.from('est_tolerancia_inventario').select('*').eq('estacion_id', estacionId).eq('estado', 'activo'),
    ]);

    setMovimientos((movRes.data as Movimiento[]) ?? []);
    setInventarioDiario((invRes.data as InventarioDiario[]) ?? []);

    const tolData = tolRes.data ?? [];
    const tolGlobal = tolData.find((t) => t.producto_id === null);
    setTolerancia(tolGlobal ? Number(tolGlobal.tolerancia_galones) : 20);

    const fisicoInit: Record<string, string> = {};
    const justInit: Record<string, string> = {};
    tanques.forEach((t) => {
      const inv = (invRes.data as InventarioDiario[])?.find((i) => i.tanque_id === t.id && i.tipo === 'final');
      fisicoInit[t.id] = inv ? String(inv.nivel_galones) : '';
      justInit[t.id] = inv?.justificacion ?? '';
    });
    setNivelFisico(fisicoInit);
    setJustificacion(justInit);

    const tieneFinal = (invRes.data as InventarioDiario[])?.some((i) => i.tipo === 'final' && i.estado_conciliacion !== 'pendiente');
    setConciliacionGuardada(tieneFinal ?? false);
    setLoading(false);
  }, [estacionId, fecha, tanques]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // For each tank, compute the theoretical inventory
  const calculo = useMemo(() => {
    return tanques.map((t) => {
      const apertura = inventarioDiario.find((i) => i.tanque_id === t.id && i.tipo === 'inicial');
      const invApertura = apertura ? Number(apertura.nivel_galones) : t.nivel_actual_galones;

      const movsTanque = movimientos.filter((m) => m.tanque_id === t.id);
      const entradas = movsTanque.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + Number(m.galones), 0);
      const ventas = movsTanque.filter((m) => m.tipo === 'salida' && m.concepto === 'venta').reduce((s, m) => s + Number(m.galones), 0);
      const ajustesPos = movsTanque.filter((m) => m.tipo === 'entrada' && m.concepto === 'ajuste_positivo').reduce((s, m) => s + Number(m.galones), 0);
      const ajustesNeg = movsTanque.filter((m) => m.tipo === 'salida' && m.concepto === 'ajuste_negativo').reduce((s, m) => s + Number(m.galones), 0);

      const teorico = invApertura + entradas - ventas + ajustesPos - ajustesNeg;
      const fisico = parseFloat(nivelFisico[t.id] || '0') || 0;
      const diferencia = fisico - teorico;
      const absDiff = Math.abs(diferencia);

      let estado: { label: string; color: string; bg: string; icon: typeof CheckCircle2 };
      if (!nivelFisico[t.id]) {
        estado = { label: 'PENDIENTE', color: 'text-slate-600', bg: 'bg-slate-50', icon: AlertTriangle };
      } else if (absDiff === 0) {
        estado = { label: 'CUADRADO', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: CheckCircle2 };
      } else if (absDiff <= tolerancia) {
        estado = { label: 'DENTRO DE TOLERANCIA', color: 'text-blue-700', bg: 'bg-blue-50', icon: CheckCircle2 };
      } else if (diferencia < 0) {
        estado = { label: 'FALTANTE', color: 'text-red-700', bg: 'bg-red-50', icon: TrendingDown };
      } else {
        estado = { label: 'SOBRANTE', color: 'text-amber-700', bg: 'bg-amber-50', icon: TrendingUp };
      }

      const requiereJustificacion = absDiff > tolerancia;
      const prod = getProducto(t.producto_id);

      return {
        tanque: t,
        producto: prod,
        invApertura,
        entradas,
        ventas,
        ajustesPos,
        ajustesNeg,
        teorico,
        fisico,
        diferencia,
        absDiff,
        estado,
        requiereJustificacion,
      };
    });
  }, [tanques, inventarioDiario, movimientos, nivelFisico, tolerancia, productos]);

  const resumen = useMemo(() => {
    const totalTeorico = calculo.reduce((s, c) => s + c.teorico, 0);
    const totalFisico = calculo.reduce((s, c) => s + c.fisico, 0);
    const totalDiferencia = totalFisico - totalTeorico;
    const faltantes = calculo.filter((c) => c.diferencia < -tolerancia);
    const sobrantes = calculo.filter((c) => c.diferencia > tolerancia);
    const cuadrados = calculo.filter((c) => Math.abs(c.diferencia) <= tolerancia && nivelFisico[c.tanque.id]);
    return { totalTeorico, totalFisico, totalDiferencia, faltantes, sobrantes, cuadrados };
  }, [calculo, tolerancia, nivelFisico]);

  // Summary by product
  const porProducto = useMemo(() => {
    const map: Record<string, { nombre: string; color: string; teorico: number; fisico: number; diferencia: number }> = {};
    calculo.forEach((c) => {
      const nombre = c.producto?.nombre ?? 'Sin producto';
      const color = c.producto?.color ?? '#94a3b8';
      if (!map[nombre]) map[nombre] = { nombre, color, teorico: 0, fisico: 0, diferencia: 0 };
      map[nombre].teorico += c.teorico;
      map[nombre].fisico += c.fisico;
      map[nombre].diferencia += c.diferencia;
    });
    return Object.values(map);
  }, [calculo]);

  const handleSave = async () => {
    const tanquesSinFisico = tanques.filter((t) => !nivelFisico[t.id]);
    if (tanquesSinFisico.length > 0) {
      toast.error(`Falta el inventario físico de ${tanquesSinFisico.length} tanque(s).`);
      return;
    }
    const sinJustificar = calculo.filter((c) => c.requiereJustificacion && !justificacion[c.tanque.id]?.trim());
    if (sinJustificar.length > 0) {
      toast.error(`Hay ${sinJustificar.length} diferencia(s) que requieren justificación.`);
      return;
    }

    setSaving(true);
    try {
      const registros = calculo.map((c) => ({
        estacion_id: estacionId,
        tanque_id: c.tanque.id,
        producto_id: c.tanque.producto_id,
        fecha,
        tipo: 'final',
        nivel_galones: c.fisico,
        nivel_teorico_galones: c.teorico,
        diferencia_galones: c.diferencia,
        estado_conciliacion: c.estado.label.toLowerCase().replace(/ /g, '_'),
        tolerancia_galones: tolerancia,
        justificacion: c.requiereJustificacion ? (justificacion[c.tanque.id]?.trim() || null) : null,
        justificado_por: c.requiereJustificacion ? (user?.email ?? null) : null,
        justificado_at: c.requiereJustificacion ? new Date().toISOString() : null,
        responsable: user?.email ?? 'Sistema',
        hora: new Date().toTimeString().slice(0, 5),
      }));

      // Delete existing 'final' records for this date/station, then insert
      await supabase.from('est_inventario_diario').delete().eq('estacion_id', estacionId).eq('fecha', fecha).eq('tipo', 'final');
      const { error } = await supabase.from('est_inventario_diario').insert(registros);
      if (error) throw error;

      // Update tank current levels
      await Promise.all(calculo.map((c) =>
        supabase.from('est_tanques').update({ nivel_actual_galones: c.fisico, updated_at: new Date().toISOString() }).eq('id', c.tanque.id)
      ));

      toast.success('Conciliación de inventario guardada.');
      setConciliacionGuardada(true);
      fetchData();
      onRefresh();
    } catch (err) {
      toast.error('Error al guardar la conciliación.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Conciliación de Inventario</h2>
          <p className="text-sm text-slate-500">{estacionNombre} — Teórico vs Físico</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1"><Calendar className="h-3 w-3" />Fecha</Label>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-40" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-500" /><p className="text-xs font-semibold text-slate-400">Teórico total</p></div>
          <p className="mt-1 text-xl font-bold text-slate-900">{fmtGal(resumen.totalTeorico)} gal</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><Fuel className="h-4 w-4 text-emerald-500" /><p className="text-xs font-semibold text-slate-400">Físico total</p></div>
          <p className="mt-1 text-xl font-bold text-slate-900">{fmtGal(resumen.totalFisico)} gal</p>
        </Card>
        <Card className={cn('p-4', resumen.totalDiferencia < 0 ? 'bg-red-50' : resumen.totalDiferencia > 0 ? 'bg-amber-50' : 'bg-emerald-50')}>
          <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-slate-400" /><p className="text-xs font-semibold text-slate-400">Diferencia total</p></div>
          <p className={cn('mt-1 text-xl font-bold', resumen.totalDiferencia < 0 ? 'text-red-700' : resumen.totalDiferencia > 0 ? 'text-amber-700' : 'text-emerald-700')}>
            {resumen.totalDiferencia > 0 ? '+' : ''}{fmtGal(resumen.totalDiferencia)} gal
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-slate-400" /><p className="text-xs font-semibold text-slate-400">Estado general</p></div>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {resumen.faltantes.length > 0 ? `${resumen.faltantes.length} faltante(s)` : ''}
            {resumen.sobrantes.length > 0 ? ` ${resumen.sobrantes.length} sobrante(s)` : ''}
            {resumen.faltantes.length === 0 && resumen.sobrantes.length === 0 ? 'Cuadrado' : ''}
          </p>
        </Card>
      </div>

      {/* Tolerance */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Label className="text-xs font-semibold text-slate-600">Tolerancia (galones):</Label>
          <Input type="number" min={0} step={0.1} value={tolerancia} onChange={(e) => setTolerancia(parseFloat(e.target.value) || 0)} className="w-28" />
          <p className="text-xs text-slate-400">Diferencias dentro de este valor se consideran tolerancia aceptable.</p>
        </div>
      </Card>

      {/* Per-tank conciliation */}
      <div className="space-y-3">
        {calculo.map((c) => {
          const eIcon = c.estado.icon;
          return (
            <Card key={c.tanque.id} className="overflow-hidden">
              <div className="h-1 w-full" style={{ background: c.producto?.color ?? '#94a3b8' }} />
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: (c.producto?.color ?? '#94a3b8') + '20' }}>
                      <Fuel className="h-5 w-5" style={{ color: c.producto?.color ?? '#94a3b8' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{c.tanque.nombre}</p>
                      <p className="text-xs text-slate-400">{c.producto?.nombre ?? 'Sin producto'}</p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold', c.estado.bg, c.estado.color)}>
                    <eIcon className="h-3 w-3" />{c.estado.label}
                  </span>
                </div>

                {/* Calculation breakdown */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-lg bg-slate-50 p-2.5">
                    <p className="text-[10px] font-semibold text-slate-400">APERTURA</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">{fmtGal(c.invApertura)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2.5">
                    <p className="text-[10px] font-semibold text-emerald-400">ENTRADAS</p>
                    <p className="mt-0.5 text-sm font-bold text-emerald-700">+{fmtGal(c.entradas)}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2.5">
                    <p className="text-[10px] font-semibold text-amber-400">VENTAS</p>
                    <p className="mt-0.5 text-sm font-bold text-amber-700">-{fmtGal(c.ventas)}</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-2.5">
                    <p className="text-[10px] font-semibold text-blue-400">AJUSTES +/-</p>
                    <p className="mt-0.5 text-sm font-bold text-blue-700">+{fmtGal(c.ajustesPos)} / -{fmtGal(c.ajustesNeg)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-2.5">
                    <p className="text-[10px] font-semibold text-slate-500">TEÓRICO</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">{fmtGal(c.teorico)}</p>
                  </div>
                  <div className={cn('rounded-lg p-2.5', c.estado.bg)}>
                    <p className={cn('text-[10px] font-semibold', c.estado.color)}>DIFERENCIA</p>
                    <p className={cn('mt-0.5 text-sm font-bold', c.estado.color)}>
                      {c.diferencia > 0 ? '+' : ''}{fmtGal(c.diferencia)}
                    </p>
                  </div>
                </div>

                {/* Physical input */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Inventario físico (gal)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={nivelFisico[c.tanque.id] ?? ''}
                      onChange={(e) => setNivelFisico((p) => ({ ...p, [c.tanque.id]: e.target.value }))}
                      disabled={conciliacionGuardada}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">% capacidad</Label>
                    <div className="flex items-center gap-2 h-9">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn('h-full rounded-full', c.estado.label === 'CRITICO' ? 'bg-red-500' : c.estado.label === 'NIVEL BAJO' ? 'bg-orange-500' : 'bg-emerald-500')}
                          style={{ width: `${Math.min((c.fisico / c.tanque.capacidad_maxima_galones) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-12 text-right">
                        {c.tanque.capacidad_maxima_galones > 0 ? ((c.fisico / c.tanque.capacidad_maxima_galones) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  {c.requiereJustificacion && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-red-600">Justificación *</Label>
                      <Input
                        value={justificacion[c.tanque.id] ?? ''}
                        onChange={(e) => setJustificacion((p) => ({ ...p, [c.tanque.id]: e.target.value }))}
                        placeholder="Motivo de la diferencia"
                        disabled={conciliacionGuardada}
                      />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Summary by product */}
      {porProducto.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">Resumen por combustible</h3>
          <div className="space-y-2">
            {porProducto.map((p) => (
              <div key={p.nombre} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                  <span className="text-sm font-semibold text-slate-800">{p.nombre}</span>
                </div>
                <div className="flex gap-6 text-xs">
                  <span><span className="text-slate-400">Teórico:</span> <strong className="text-slate-800">{fmtGal(p.teorico)}</strong></span>
                  <span><span className="text-slate-400">Físico:</span> <strong className="text-slate-800">{fmtGal(p.fisico)}</strong></span>
                  <span className={cn('font-bold', p.diferencia < 0 ? 'text-red-600' : p.diferencia > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                    {p.diferencia > 0 ? '+' : ''}{fmtGal(p.diferencia)}
                  </span>
                </div>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">TOTAL</span>
              <div className="flex gap-6 text-xs">
                <span className="font-bold text-slate-900">{fmtGal(resumen.totalTeorico)}</span>
                <span className="font-bold text-slate-900">{fmtGal(resumen.totalFisico)}</span>
                <span className={cn('font-bold', resumen.totalDiferencia < 0 ? 'text-red-600' : resumen.totalDiferencia > 0 ? 'text-amber-600' : 'text-emerald-600')}>
                  {resumen.totalDiferencia > 0 ? '+' : ''}{fmtGal(resumen.totalDiferencia)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Save */}
      {!conciliacionGuardada ? (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2 bg-amber-600 hover:bg-amber-700">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar conciliación
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Conciliación guardada para {fecha}. Los niveles de los tanques se actualizaron.
        </div>
      )}
    </div>
  );
}
