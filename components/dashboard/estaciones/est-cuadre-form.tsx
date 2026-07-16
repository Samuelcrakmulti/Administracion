'use client';

import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle2, AlertTriangle, XCircle, Loader2, Save, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Turno, Lectura } from './est-operacion';

const METODOS = [
  { key: 'efectivo', label: 'Efectivo', icon: '💵' },
  { key: 'tarjetas_credito', label: 'Tarjeta Crédito', icon: '💳' },
  { key: 'tarjetas_debito', label: 'Tarjeta Débito', icon: '🏦' },
  { key: 'transferencias', label: 'Transferencias', icon: '📲' },
  { key: 'qr', label: 'Código QR', icon: '📱' },
  { key: 'credito_empresas', label: 'Crédito Empresas', icon: '🏢' },
  { key: 'otros', label: 'Otros', icon: '📋' },
] as const;

type MetodoPago = typeof METODOS[number]['key'];

function fmt(v: number) { return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }); }
function fmtGal(v: number) { return `${v.toLocaleString('es-CO', { maximumFractionDigits: 3 })} gal`; }

interface Props {
  turno: Turno;
  lecturas: Lectura[];
  estacionId: string;
  onGuardado: () => void;
}

export function EstCuadreForm({ turno, lecturas, estacionId, onGuardado }: Props) {
  const [pagos, setPagos] = useState<Record<MetodoPago, string>>({
    efectivo: '', tarjetas_credito: '', tarjetas_debito: '',
    transferencias: '', qr: '', credito_empresas: '', otros: '',
  });
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [existingCuadre, setExistingCuadre] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    supabase.from('est_cuadres').select('*').eq('turno_id', turno.id).maybeSingle().then(({ data }) => {
      if (data) {
        setExistingCuadre(data);
        const p: Record<MetodoPago, string> = {} as Record<MetodoPago, string>;
        METODOS.forEach((m) => { p[m.key] = String((data as Record<string, number>)[m.key] ?? 0); });
        setPagos(p);
        setObservaciones(data.observaciones_cuadre ?? '');
      }
    });
  }, [turno.id]);

  const ventas_esperadas = lecturas.reduce((s, l) => s + (l.venta_total ?? 0), 0);
  const totalGalones = lecturas.reduce((s, l) => s + (l.litros_vendidos ?? 0), 0);
  const totalEntregado = METODOS.reduce((s, m) => s + (parseFloat(pagos[m.key]) || 0), 0);
  const diferencia = ventas_esperadas - totalEntregado;
  const resultado = Math.abs(diferencia) < 1 ? 'correcto' : diferencia > 0 ? 'faltante' : 'sobrante';
  const hasFinals = lecturas.every((l) => l.lectura_final !== null);

  const porProducto = lecturas.reduce<Record<string, { nombre: string; color: string; galones: number; venta: number }>>((acc, l) => {
    const key = l.nombre_producto ?? 'Sin asignar';
    if (!acc[key]) acc[key] = { nombre: key, color: l.color_producto, galones: 0, venta: 0 };
    acc[key].galones += l.litros_vendidos ?? 0;
    acc[key].venta += l.venta_total ?? 0;
    return acc;
  }, {});

  const handleGuardar = async () => {
    if (!hasFinals) { toast.error('Debes guardar todas las lecturas finales antes del cuadre.'); return; }
    if (resultado !== 'correcto' && !observaciones.trim()) { toast.error('Hay una diferencia. Escribe una observación con el motivo.'); return; }
    setSaving(true);
    try {
      const payload = {
        turno_id: turno.id, estacion_id: estacionId,
        ventas_esperadas,
        efectivo: parseFloat(pagos.efectivo) || 0,
        tarjetas_credito: parseFloat(pagos.tarjetas_credito) || 0,
        tarjetas_debito: parseFloat(pagos.tarjetas_debito) || 0,
        transferencias: parseFloat(pagos.transferencias) || 0,
        qr: parseFloat(pagos.qr) || 0,
        credito_empresas: parseFloat(pagos.credito_empresas) || 0,
        otros: parseFloat(pagos.otros) || 0,
        total_entregado: totalEntregado, diferencia, resultado,
        observaciones_cuadre: observaciones || null,
      };
      if (existingCuadre) {
        await supabase.from('est_cuadres').update(payload).eq('turno_id', turno.id);
      } else {
        await supabase.from('est_cuadres').insert(payload);
      }
      toast.success('Cuadre guardado. Revisa la Entrega de Turno antes de enviarlo al supervisor.');
      onGuardado();
    } catch (err) { toast.error('Error al guardar el cuadre.'); console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Cuadre de caja — {turno.empleado}</h2>
        <p className="text-sm text-slate-500">Registra el dinero entregado. El sistema calculará la diferencia automáticamente.</p>
      </div>

      {!hasFinals && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/60 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm font-medium text-amber-800">Guarda primero todas las lecturas finales antes de hacer el cuadre.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Resumen de ventas */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3"><p className="text-sm font-bold text-slate-900">Resumen de ventas</p></div>
            <div className="p-5 space-y-3">
              {Object.values(porProducto).map((p) => (
                <div key={p.nombre} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ background: p.color }} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{fmtGal(p.galones)}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{fmt(p.venta)}</p>
                </div>
              ))}
              <div className="rounded-xl bg-slate-900 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Total galones</p>
                  <p className="text-lg font-extrabold text-white">{fmtGal(totalGalones)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Ventas esperadas</p>
                  <p className="text-2xl font-extrabold text-emerald-400">{fmt(ventas_esperadas)}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Métodos de pago */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3"><p className="text-sm font-bold text-slate-900">Dinero entregado</p></div>
            <div className="p-5 space-y-3">
              {METODOS.map((m) => (
                <div key={m.key} className="flex items-center gap-3">
                  <span className="text-lg w-6 shrink-0 text-center">{m.icon}</span>
                  <Label className="flex-1 text-sm font-medium text-slate-700">{m.label}</Label>
                  <div className="relative w-36">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">$</span>
                    <Input type="number" min={0} step={100} value={pagos[m.key]}
                      onChange={(e) => setPagos((p) => ({ ...p, [m.key]: e.target.value }))}
                      className="pl-7 text-right font-mono text-sm" placeholder="0" />
                  </div>
                </div>
              ))}
              <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-bold text-blue-800">Total entregado</span>
                <span className="text-lg font-extrabold text-blue-800">{fmt(totalEntregado)}</span>
              </div>
            </div>
          </Card>

          {/* Resultado */}
          <div className={cn('rounded-2xl border-2 p-5', resultado === 'correcto' ? 'border-emerald-300 bg-emerald-50' : resultado === 'sobrante' ? 'border-blue-300 bg-blue-50' : 'border-red-300 bg-red-50')}>
            <div className="flex items-center gap-3 mb-3">
              {resultado === 'correcto' ? <CheckCircle2 className="h-7 w-7 text-emerald-600" /> : resultado === 'sobrante' ? <TrendingUp className="h-7 w-7 text-blue-600" /> : <XCircle className="h-7 w-7 text-red-600" />}
              <div>
                <p className={cn('text-base font-extrabold', resultado === 'correcto' ? 'text-emerald-800' : resultado === 'sobrante' ? 'text-blue-800' : 'text-red-800')}>
                  {resultado === 'correcto' ? 'Cuadre Correcto' : resultado === 'sobrante' ? 'Sobrante de caja' : 'Faltante de caja'}
                </p>
                {resultado !== 'correcto' && <p className={cn('text-2xl font-extrabold', resultado === 'sobrante' ? 'text-blue-700' : 'text-red-700')}>{fmt(Math.abs(diferencia))}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-white/70 p-2"><p className="text-xs text-slate-500">Esperado</p><p className="text-sm font-bold text-slate-900">{fmt(ventas_esperadas)}</p></div>
              <div className="rounded-xl bg-white/70 p-2"><p className="text-xs text-slate-500">Entregado</p><p className="text-sm font-bold text-slate-900">{fmt(totalEntregado)}</p></div>
              <div className={cn('rounded-xl p-2', resultado === 'correcto' ? 'bg-emerald-100' : resultado === 'sobrante' ? 'bg-blue-100' : 'bg-red-100')}>
                <p className="text-xs text-slate-500">Diferencia</p>
                <p className={cn('text-sm font-bold', resultado === 'correcto' ? 'text-emerald-700' : resultado === 'sobrante' ? 'text-blue-700' : 'text-red-700')}>{fmt(Math.abs(diferencia))}</p>
              </div>
            </div>
          </div>

          {resultado !== 'correcto' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observación * <span className="text-red-500">(requerida por diferencia)</span></Label>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2}
                placeholder="Explica el motivo de la diferencia…"
                className="w-full resize-none rounded-xl border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400" />
            </div>
          )}

          <Button onClick={handleGuardar} disabled={saving || !hasFinals} className="w-full gap-2 bg-amber-600 hover:bg-amber-700 py-4 text-base font-bold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-5 w-5" />}Guardar cuadre y ver entrega
          </Button>
        </div>
      </div>
    </div>
  );
}
