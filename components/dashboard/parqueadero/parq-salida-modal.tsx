'use client';

import { useState, useMemo } from 'react';
import { Clock, Car, DollarSign, Loader2, CreditCard, Smartphone, Banknote, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Registro = {
  id: string; placa: string; tipo_vehiculo: string; nombre_conductor: string | null;
  espacio: string | null; hora_ingreso: string;
};
type Tarifa = {
  tipo_vehiculo: string; tarifa_primera_hora: number; tarifa_hora_adicional: number; tarifa_maxima_dia: number;
};
type Config = { tiempo_gracia_min: number; iva_pct: number };

const METODOS = [
  { value: 'Efectivo', label: 'Efectivo', icon: Banknote },
  { value: 'Tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'QR', label: 'QR', icon: Smartphone },
  { value: 'Transferencia', label: 'Transferencia', icon: Building2 },
];

const TIPOS_LABEL: Record<string, string> = {
  automovil: 'Automóvil', motocicleta: 'Motocicleta', bicicleta: 'Bicicleta',
  camioneta: 'Camioneta', camion: 'Camión',
};

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

function formatTiempo(min: number) {
  const h = Math.floor(min / 60); const m = min % 60;
  if (h > 0) return `${h}h ${m}min`; return `${m}min`;
}

function calcularCosto(minutos: number, tarifa: Tarifa, gracia: number): number {
  if (minutos <= gracia) return 0;
  const facturables = minutos - gracia;
  if (facturables <= 60) return tarifa.tarifa_primera_hora;
  const adicionales = Math.ceil((facturables - 60) / 60);
  const costo = tarifa.tarifa_primera_hora + adicionales * tarifa.tarifa_hora_adicional;
  return Math.min(costo, tarifa.tarifa_maxima_dia);
}

interface Props {
  open: boolean;
  registro: Registro | null;
  tarifas: Tarifa[];
  config: Config;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParqSalidaModal({ open, registro, tarifas, config, onClose, onSuccess }: Props) {
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [descuento, setDescuento] = useState(0);
  const [loading, setLoading] = useState(false);

  const calculo = useMemo(() => {
    if (!registro) return null;
    const ahora = new Date();
    const ingreso = new Date(registro.hora_ingreso);
    const minutos = Math.floor((ahora.getTime() - ingreso.getTime()) / 60000);
    const tarifa = tarifas.find((t) => t.tipo_vehiculo === registro.tipo_vehiculo) ?? {
      tipo_vehiculo: registro.tipo_vehiculo,
      tarifa_primera_hora: 3000, tarifa_hora_adicional: 2000, tarifa_maxima_dia: 25000,
    };
    const subtotal = calcularCosto(minutos, tarifa, config.tiempo_gracia_min);
    const descuentoVal = (subtotal * descuento) / 100;
    const base = subtotal - descuentoVal;
    const ivaVal = (base * config.iva_pct) / 100;
    const total = base + ivaVal;
    return { minutos, subtotal, descuentoVal, ivaVal, total, tarifa, ahora };
  }, [registro, tarifas, config, descuento]);

  const handleConfirmar = async () => {
    if (!registro || !calculo) return;
    setLoading(true);
    try {
      // Insert finanza income
      const { data: finanza, error: fErr } = await supabase.from('finanzas').insert({
        tipo: 'Ingreso',
        categoria: 'Parqueadero',
        descripcion: `Parqueadero — ${TIPOS_LABEL[registro.tipo_vehiculo] || registro.tipo_vehiculo} ${registro.placa}`,
        valor: calculo.total,
        fecha: new Date().toISOString().split('T')[0],
      }).select('id').single();
      if (fErr) throw fErr;

      // Update registro
      const { error: rErr } = await supabase.from('parqueadero_registros').update({
        hora_salida: calculo.ahora.toISOString(),
        tiempo_minutos: calculo.minutos,
        subtotal: calculo.subtotal,
        descuento: calculo.descuentoVal,
        iva: calculo.ivaVal,
        total: calculo.total,
        metodo_pago: metodoPago,
        estado: 'pagado',
        finanza_id: finanza?.id ?? null,
      }).eq('id', registro.id);
      if (rErr) throw rErr;

      toast.success(`Pago registrado: ${fmt(calculo.total)}`);
      setDescuento(0);
      setMetodoPago('Efectivo');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Error al procesar el pago.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!registro || !calculo) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !loading) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </span>
            Registrar salida y cobro
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Vehicle info */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft">
                  <Car className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{registro.placa}</p>
                  <p className="text-xs text-slate-500">{TIPOS_LABEL[registro.tipo_vehiculo] || registro.tipo_vehiculo}{registro.espacio ? ` · Espacio ${registro.espacio}` : ''}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-sm font-semibold text-slate-900">{formatTiempo(calculo.minutos)}</span>
                </div>
                <p className="text-xs text-slate-400">permanencia</p>
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="space-y-2 rounded-xl bg-slate-50/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detalle del cobro</h3>
            <div className="space-y-1.5">
              <Row label="Tarifa aplicada" value={`${fmt(calculo.tarifa.tarifa_primera_hora)} primera hora + ${fmt(calculo.tarifa.tarifa_hora_adicional)}/h`} small />
              <Row label="Subtotal" value={fmt(calculo.subtotal)} />
              {calculo.descuentoVal > 0 && <Row label={`Descuento (${descuento}%)`} value={`- ${fmt(calculo.descuentoVal)}`} green />}
              {calculo.ivaVal > 0 && <Row label={`IVA (${config.iva_pct}%)`} value={fmt(calculo.ivaVal)} />}
              <div className="mt-2 border-t border-slate-200 pt-2">
                <Row label="TOTAL A PAGAR" value={fmt(calculo.total)} bold />
              </div>
            </div>
          </div>

          {/* Discount */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Descuento (%)</p>
            <div className="flex gap-2">
              {[0, 5, 10, 20, 50].map((d) => (
                <button key={d} type="button" onClick={() => setDescuento(d)}
                  className={cn('flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all', descuento === d ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                  {d}%
                </button>
              ))}
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Método de pago</p>
            <div className="grid grid-cols-4 gap-2">
              {METODOS.map((m) => (
                <button key={m.value} type="button" onClick={() => setMetodoPago(m.value)}
                  className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-all', metodoPago === m.value ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300')}>
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="button" className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmar} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              Confirmar cobro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, small, bold, green }: { label: string; value: string; small?: boolean; bold?: boolean; green?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn('text-slate-500', small ? 'text-xs' : 'text-sm')}>{label}</span>
      <span className={cn(small ? 'text-xs' : 'text-sm', bold ? 'font-bold text-slate-900' : green ? 'font-medium text-emerald-600' : 'font-medium text-slate-700')}>{value}</span>
    </div>
  );
}
