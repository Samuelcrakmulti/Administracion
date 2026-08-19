'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, Save, CheckCircle2, AlertTriangle, TrendingDown, TrendingUp,
  Scale, ShieldCheck, FileText, History, Lock,
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
import type { Cierre } from './est-cierre-detalle';

type Lectura = {
  id: string;
  producto_id: string | null;
  nombre_producto: string | null;
  galones_vendidos: number | null;
};

type PagoTurno = { id: string; medio_pago_nombre: string; valor: number };
type Vale = { id: string; concepto_nombre: string; valor: number };
type Ajuste = { id: string; concepto: string; tipo: string; valor: number; motivo: string };
type PrecioHistorial = { producto_id: string; precio_galon: number; fecha_inicio: string; fecha_fin: string | null; activo: boolean };
type CuadreExistente = {
  id: string;
  ventas_esperadas: number;
  ventas_esperadas_galones: number;
  efectivo: number;
  tarjetas_credito: number;
  tarjetas_debito: number;
  transferencias: number;
  qr: number;
  credito_empresas: number;
  otros: number;
  total_entregado: number;
  diferencia: number;
  resultado: string;
  estado_cuadre: string;
  tolerancia: number;
  justificacion: string | null;
  justificado_por: string | null;
  justificado_at: string | null;
  aprobado_por: string | null;
  aprobado_at: string | null;
};

type CuadreAuditoria = {
  id: string;
  tabla_afectada: string;
  campo_modificado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  accion: string;
  usuario: string | null;
  motivo: string | null;
  created_at: string;
};

function fmtMoney(n: number): string {
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtGal(n: number): string {
  return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

interface Props {
  cierre: Cierre;
  estacion: Estacion;
  readOnly: boolean;
}

export function EstCierreCuadre({ cierre, estacion, readOnly }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [precios, setPrecios] = useState<PrecioHistorial[]>([]);
  const [pagos, setPagos] = useState<PagoTurno[]>([]);
  const [vales, setVales] = useState<Vale[]>([]);
  const [ajustes, setAjustes] = useState<Ajuste[]>([]);
  const [cuadre, setCuadre] = useState<CuadreExistente | null>(null);
  const [auditoria, setAuditoria] = useState<CuadreAuditoria[]>([]);
  const [tolerancia, setTolerancia] = useState(1000);
  const [justificacion, setJustificacion] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [lecRes, preRes, pagosRes, valesRes, ajustesRes, cuadreRes, audRes] = await Promise.all([
      supabase.from('est_lecturas').select('*').eq('cierre_id', cierre.id).not('galones_vendidos', 'is', null),
      supabase.from('est_precios_combustible').select('*').eq('estacion_id', estacion.id).order('fecha_inicio', { ascending: false }),
      supabase.from('est_pagos_turno').select('*').eq('cierre_id', cierre.id),
      supabase.from('est_vales').select('*').eq('cierre_id', cierre.id),
      supabase.from('est_ajustes').select('*').eq('cierre_id', cierre.id),
      supabase.from('est_cuadres').select('*').eq('cierre_id', cierre.id).maybeSingle(),
      supabase.from('est_cuadre_auditoria').select('*').eq('cierre_id', cierre.id).order('created_at', { ascending: false }),
    ]);

    setLecturas((lecRes.data as Lectura[]) ?? []);
    setPrecios((preRes.data as PrecioHistorial[]) ?? []);
    setPagos((pagosRes.data as PagoTurno[]) ?? []);
    setVales((valesRes.data as Vale[]) ?? []);
    setAjustes((ajustesRes.data as Ajuste[]) ?? []);
    const cuadreData = cuadreRes.data as CuadreExistente | null;
    setCuadre(cuadreData);
    if (cuadreData) {
      setTolerancia(Number(cuadreData.tolerancia) || 0);
      setJustificacion(cuadreData.justificacion ?? '');
    }
    setAuditoria((audRes.data as CuadreAuditoria[]) ?? []);
    setLoading(false);
  }, [cierre.id, estacion.id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Calculate expected sales from lecturas × historical price
  const ventaEsperada = useMemo(() => {
    const fechaCierre = cierre.fecha;
    return lecturas.reduce((total, l) => {
      if (!l.producto_id || !l.galones_vendidos) return total;
      const candidatos = precios
        .filter((p) => p.producto_id === l.producto_id && p.fecha_inicio <= fechaCierre)
        .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
      const precio = candidatos[0];
      return total + (precio ? l.galones_vendidos * precio.precio_galon : 0);
    }, 0);
  }, [lecturas, precios, cierre.fecha]);

  const galonesEsperados = useMemo(() => {
    return lecturas.reduce((s, l) => s + (l.galones_vendidos ?? 0), 0);
  }, [lecturas]);

  const ventaPorProducto = useMemo(() => {
    const fechaCierre = cierre.fecha;
    const m: Record<string, { nombre: string; galones: number; venta: number }> = {};
    lecturas.forEach((l) => {
      const nombre = l.nombre_producto ?? 'Sin producto';
      if (!m[nombre]) m[nombre] = { nombre, galones: 0, venta: 0 };
      m[nombre].galones += l.galones_vendidos ?? 0;
      if (l.producto_id && l.galones_vendidos) {
        const candidatos = precios
          .filter((p) => p.producto_id === l.producto_id && p.fecha_inicio <= fechaCierre)
          .sort((a, b) => b.fecha_inicio.localeCompare(a.fecha_inicio));
        const precio = candidatos[0];
        m[nombre].venta += precio ? l.galones_vendidos * precio.precio_galon : 0;
      }
    });
    return Object.values(m).sort((a, b) => b.venta - a.venta);
  }, [lecturas, precios, cierre.fecha]);

  const totalPagos = useMemo(() => pagos.reduce((s, p) => s + (p.valor || 0), 0), [pagos]);
  const totalVales = useMemo(() => vales.reduce((s, v) => s + (v.valor || 0), 0), [vales]);
  const ajustesPos = useMemo(() => ajustes.filter((a) => a.tipo === 'positivo').reduce((s, a) => s + (a.valor || 0), 0), [ajustes]);
  const ajustesNeg = useMemo(() => ajustes.filter((a) => a.tipo === 'negativo').reduce((s, a) => s + (a.valor || 0), 0), [ajustes]);

  // Total registrado = pagos + vales + ajustes positivos - ajustes negativos
  const totalRegistrado = useMemo(() => totalPagos + totalVales + ajustesPos - ajustesNeg, [totalPagos, totalVales, ajustesPos, ajustesNeg]);

  const diferencia = useMemo(() => totalRegistrado - ventaEsperada, [totalRegistrado, ventaEsperada]);
  const absDiff = Math.abs(diferencia);

  const estadoCuadre = useMemo(() => {
    if (absDiff === 0) return 'cuadrado';
    if (absDiff <= tolerancia) return 'dentro_tolerancia';
    return diferencia < 0 ? 'faltante' : 'sobrante';
  }, [diferencia, absDiff, tolerancia]);

  const estadoInfo = useMemo(() => {
    switch (estadoCuadre) {
      case 'cuadrado':
        return { label: 'CUADRE CORRECTO', icon: CheckCircle2, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'dentro_tolerancia':
        return { label: 'DENTRO DE TOLERANCIA', icon: CheckCircle2, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' };
      case 'faltante':
        return { label: 'FALTANTE', icon: TrendingDown, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' };
      case 'sobrante':
        return { label: 'SOBRANTE', icon: TrendingUp, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' };
      default:
        return { label: 'PENDIENTE', icon: Scale, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-400' };
    }
  }, [estadoCuadre]);

  const requiereRevision = absDiff > tolerancia;
  const eIcon = estadoInfo.icon;

  const handleSaveCuadre = async () => {
    if (requiereRevision && !justificacion.trim()) {
      toast.error('Debe ingresar una justificación para la diferencia.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        cierre_id: cierre.id,
        estacion_id: estacion.id,
        turno_id: cierre.turno_id,
        ventas_esperadas: ventaEsperada,
        ventas_esperadas_galones: galonesEsperados,
        efectivo: pagos.find((p) => p.medio_pago_nombre.toLowerCase().includes('efectivo'))?.valor ?? 0,
        tarjetas_credito: pagos.filter((p) => p.medio_pago_nombre.toLowerCase().includes('tarjeta') || p.medio_pago_nombre.toLowerCase().includes('visa') || p.medio_pago_nombre.toLowerCase().includes('master')).reduce((s, p) => s + p.valor, 0),
        tarjetas_debito: 0,
        transferencias: pagos.find((p) => p.medio_pago_nombre.toLowerCase().includes('transfer'))?.valor ?? 0,
        qr: pagos.find((p) => p.medio_pago_nombre.toLowerCase().includes('qr'))?.valor ?? 0,
        credito_empresas: 0,
        otros: pagos.filter((p) => !['efectivo', 'tarjeta', 'transfer', 'qr', 'visa', 'master'].some((k) => p.medio_pago_nombre.toLowerCase().includes(k))).reduce((s, p) => s + p.valor, 0),
        total_entregado: totalRegistrado,
        diferencia,
        resultado: estadoCuadre,
        estado_cuadre: requiereRevision ? 'requiere_revision' : estadoCuadre,
        tolerancia,
        justificacion: justificacion.trim() || null,
        justificado_por: requiereRevision ? (user?.email ?? null) : null,
        justificado_at: requiereRevision ? new Date().toISOString() : null,
        updated_by: user?.email ?? null,
        updated_at: new Date().toISOString(),
      };

      if (cuadre) {
        const { error } = await supabase.from('est_cuadres').update(payload).eq('id', cuadre.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('est_cuadres').insert(payload);
        if (error) throw error;
      }

      await supabase.from('est_cuadre_auditoria').insert({
        cierre_id: cierre.id,
        estacion_id: estacion.id,
        tabla_afectada: 'est_cuadres',
        campo_modificado: 'cuadre_completo',
        valor_anterior: cuadre ? `${cuadre.estado_cuadre} / ${cuadre.diferencia}` : null,
        valor_nuevo: `${payload.estado_cuadre} / ${payload.diferencia}`,
        accion: 'guardar_cuadre',
        usuario: user?.email ?? 'Sistema',
        motivo: justificacion.trim() || null,
      });

      toast.success('Cuadre guardado correctamente.');
      fetchAll();
    } catch (err) {
      toast.error('Error al guardar el cuadre.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAprobar = async () => {
    if (!cuadre) { toast.error('Guarda el cuadre primero.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('est_cuadres').update({
        estado_cuadre: 'aprobado',
        aprobado_por: user?.email ?? null,
        aprobado_at: new Date().toISOString(),
        updated_by: user?.email ?? null,
        updated_at: new Date().toISOString(),
      }).eq('id', cuadre.id);
      if (error) throw error;

      await supabase.from('est_cuadre_auditoria').insert({
        cierre_id: cierre.id,
        estacion_id: estacion.id,
        tabla_afectada: 'est_cuadres',
        campo_modificado: 'estado_cuadre',
        valor_anterior: cuadre.estado_cuadre,
        valor_nuevo: 'aprobado',
        accion: 'aprobacion',
        usuario: user?.email ?? 'Sistema',
      });

      toast.success('Cuadre aprobado.');
      fetchAll();
    } catch (err) {
      toast.error('Error al aprobar.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cuadre summary card */}
      <Card className={cn('p-6 border-2', estadoInfo.border, estadoInfo.bg)}>
        <div className="flex items-center gap-3 mb-5">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', estadoInfo.bg, estadoInfo.color)}>
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cuadre del Turno</h3>
            <p className="text-xs text-slate-500">Comparación automática entre venta esperada y dinero registrado</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Venta esperada */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase">Venta esperada</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{fmtMoney(ventaEsperada)}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{fmtGal(galonesEsperados)} galones vendidos</p>
          </div>
          {/* Total registrado */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase">Dinero registrado</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{fmtMoney(totalRegistrado)}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Pagos + vales + ajustes</p>
          </div>
          {/* Diferencia */}
          <div className={cn('rounded-xl border-2 p-4', estadoInfo.border, estadoInfo.bg)}>
            <p className={cn('text-xs font-semibold uppercase', estadoInfo.color)}>Diferencia</p>
            <p className={cn('mt-1 text-xl font-bold', estadoInfo.color)}>
              {diferencia < 0 ? '-' : '+'}{fmtMoney(absDiff)}
            </p>
            <div className={cn('mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', estadoInfo.bg, estadoInfo.color)}>
              <eIcon className="h-3 w-3" />
              {estadoInfo.label}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-white/70 p-3">
            <p className="text-[10px] text-slate-400 font-semibold">Efectivo + Pagos</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">{fmtMoney(totalPagos)}</p>
          </div>
          <div className="rounded-lg bg-white/70 p-3">
            <p className="text-[10px] text-slate-400 font-semibold">Vales</p>
            <p className="mt-0.5 text-sm font-bold text-slate-800">{fmtMoney(totalVales)}</p>
          </div>
          <div className="rounded-lg bg-white/70 p-3">
            <p className="text-[10px] text-slate-400 font-semibold">Ajustes +</p>
            <p className="mt-0.5 text-sm font-bold text-emerald-700">+{fmtMoney(ajustesPos)}</p>
          </div>
          <div className="rounded-lg bg-white/70 p-3">
            <p className="text-[10px] text-slate-400 font-semibold">Ajustes -</p>
            <p className="mt-0.5 text-sm font-bold text-red-700">-{fmtMoney(ajustesNeg)}</p>
          </div>
        </div>
      </Card>

      {/* Sales by product */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Cuadre por combustible</h3>
        </div>
        {ventaPorProducto.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin lecturas registradas.</p>
        ) : (
          <div className="space-y-2">
            {ventaPorProducto.map((p) => (
              <div key={p.nombre} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5">
                <div>
                  <span className="text-sm font-semibold text-slate-800">{p.nombre}</span>
                  <span className="ml-2 text-xs text-slate-400">{fmtGal(p.galones)} gal</span>
                </div>
                <span className="text-sm font-bold text-slate-900">{fmtMoney(p.venta)}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Total</span>
              <span className="text-base font-bold text-amber-700">{fmtMoney(ventaEsperada)}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Tolerance + justification */}
      {!readOnly && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Configuración del cuadre</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Tolerancia ($)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <Input
                  type="number"
                  min={0}
                  value={tolerancia}
                  onChange={(e) => setTolerancia(parseFloat(e.target.value) || 0)}
                  className="pl-7"
                />
              </div>
              <p className="text-[10px] text-slate-400">Diferencias dentro de este valor se marcan como tolerancia.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Estado calculado</Label>
              <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', estadoInfo.border, estadoInfo.bg)}>
                <eIcon className={cn('h-4 w-4', estadoInfo.color)} />
                <span className={cn('text-sm font-bold', estadoInfo.color)}>{estadoInfo.label}</span>
              </div>
            </div>
          </div>

          {requiereRevision && (
            <div className="mt-4 space-y-1.5">
              <Label className="text-xs font-semibold text-red-600">Justificación de la diferencia *</Label>
              <Textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                rows={3}
                placeholder="Explique el motivo de la diferencia. Es obligatorio cuando la diferencia supera la tolerancia."
              />
              <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">
                  Este turno presenta una diferencia de {fmtMoney(absDiff)} que requiere revisión.
                  {!justificacion.trim() && ' Debe ingresar una justificación antes de guardar.'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <Button onClick={handleSaveCuadre} disabled={saving} className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar cuadre
            </Button>
            {cuadre && cuadre.estado_cuadre !== 'aprobado' && requiereRevision && (
              <Button onClick={handleAprobar} disabled={saving || !justificacion.trim()} variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <ShieldCheck className="h-4 w-4" />
                Aprobar con justificación
              </Button>
            )}
            {cuadre && cuadre.estado_cuadre !== 'aprobado' && !requiereRevision && (
              <Button onClick={handleAprobar} disabled={saving} variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <ShieldCheck className="h-4 w-4" />
                Aprobar cuadre
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Current cuadre state */}
      {cuadre && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Cuadre guardado</h3>
            <Badge variant="outline" className={cn('ml-auto text-[10px]', cuadre.estado_cuadre === 'aprobado' ? 'border-emerald-200 text-emerald-700' : 'border-amber-200 text-amber-700')}>
              {cuadre.estado_cuadre.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div><span className="text-slate-400">Venta esperada:</span> <strong className="text-slate-800">{fmtMoney(Number(cuadre.ventas_esperadas))}</strong></div>
            <div><span className="text-slate-400">Total entregado:</span> <strong className="text-slate-800">{fmtMoney(Number(cuadre.total_entregado))}</strong></div>
            <div><span className="text-slate-400">Diferencia:</span> <strong className={Number(cuadre.diferencia) < 0 ? 'text-red-600' : 'text-emerald-600'}>{Number(cuadre.diferencia) < 0 ? '' : '+'}{fmtMoney(Number(cuadre.diferencia))}</strong></div>
            <div><span className="text-slate-400">Tolerancia:</span> <strong className="text-slate-800">{fmtMoney(Number(cuadre.tolerancia))}</strong></div>
          </div>
          {cuadre.justificacion && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-3">
              <p className="text-xs font-semibold text-amber-700">Justificación</p>
              <p className="mt-1 text-xs text-amber-800">{cuadre.justificacion}</p>
              <p className="mt-1 text-[10px] text-amber-500">Por {cuadre.justificado_por} · {cuadre.justificado_at ? new Date(cuadre.justificado_at).toLocaleString('es-CO') : ''}</p>
            </div>
          )}
          {cuadre.aprobado_por && (
            <div className="mt-2 text-[10px] text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Aprobado por {cuadre.aprobado_por} · {cuadre.aprobado_at ? new Date(cuadre.aprobado_at).toLocaleString('es-CO') : ''}
            </div>
          )}
        </Card>
      )}

      {/* Auditoría */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-900">Auditoría del cuadre</h3>
        </div>
        {auditoria.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin registros de auditoría.</p>
        ) : (
          <div className="space-y-2">
            {auditoria.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                  <History className="h-3.5 w-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-800">{a.accion.replace(/_/g, ' ')}</span>
                    {a.valor_anterior && a.valor_nuevo && (
                      <span className="text-xs text-slate-400">{a.valor_anterior} → {a.valor_nuevo}</span>
                    )}
                  </div>
                  {a.motivo && <p className="mt-0.5 text-xs text-slate-500">{a.motivo}</p>}
                  <p className="mt-0.5 text-[10px] text-slate-400">{a.usuario ?? 'Sistema'} · {new Date(a.created_at).toLocaleString('es-CO')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {readOnly && (
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500">
          <Lock className="h-4 w-4" /> Este cierre está cerrado. El cuadre no puede modificarse.
        </div>
      )}
    </div>
  );
}
