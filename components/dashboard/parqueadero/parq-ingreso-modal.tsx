'use client';

import { useState } from 'react';
import { Car, Bike, Truck, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TIPOS = [
  { value: 'automovil', label: 'Automóvil', icon: Car },
  { value: 'motocicleta', label: 'Motocicleta', icon: Bike },
  { value: 'bicicleta', label: 'Bicicleta', icon: Bike },
  { value: 'camioneta', label: 'Camioneta', icon: Car },
  { value: 'camion', label: 'Camión', icon: Truck },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParqIngresoModal({ open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    placa: '',
    tipo_vehiculo: 'automovil',
    nombre_conductor: '',
    documento: '',
    telefono: '',
    espacio: '',
    observaciones: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa.trim()) { toast.error('Ingresa la placa del vehículo.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.from('parqueadero_registros').insert({
        placa: form.placa.trim().toUpperCase(),
        tipo_vehiculo: form.tipo_vehiculo,
        nombre_conductor: form.nombre_conductor.trim() || null,
        documento: form.documento.trim() || null,
        telefono: form.telefono.trim() || null,
        espacio: form.espacio.trim() || null,
        observaciones: form.observaciones.trim() || null,
        hora_ingreso: new Date().toISOString(),
        estado: 'activo',
      });
      if (error) throw error;
      toast.success(`Vehículo ${form.placa.toUpperCase()} registrado.`);
      setForm({ placa: '', tipo_vehiculo: 'automovil', nombre_conductor: '', documento: '', telefono: '', espacio: '', observaciones: '' });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Error al registrar el vehículo. Intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Car className="h-4 w-4 text-primary" />
            </span>
            Registrar ingreso
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          {/* Tipo de vehículo */}
          <div>
            <Label className="mb-2 block text-xs font-semibold text-slate-600">Tipo de vehículo</Label>
            <div className="grid grid-cols-5 gap-2">
              {TIPOS.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => set('tipo_vehiculo', t.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-all',
                    form.tipo_vehiculo === t.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <t.icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{t.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Placa + Espacio */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="placa" className="text-xs font-semibold text-slate-600">Placa *</Label>
              <Input id="placa" value={form.placa} onChange={(e) => set('placa', e.target.value)} placeholder="ABC-123" className="uppercase" maxLength={10} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="espacio" className="text-xs font-semibold text-slate-600">Espacio</Label>
              <Input id="espacio" value={form.espacio} onChange={(e) => set('espacio', e.target.value)} placeholder="A-12" maxLength={10} />
            </div>
          </div>

          {/* Conductor */}
          <div className="space-y-1.5">
            <Label htmlFor="conductor" className="text-xs font-semibold text-slate-600">Nombre del conductor <span className="text-slate-400 font-normal">(opcional)</span></Label>
            <Input id="conductor" value={form.nombre_conductor} onChange={(e) => set('nombre_conductor', e.target.value)} placeholder="Nombre completo" />
          </div>

          {/* Documento + Teléfono */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Documento <span className="text-slate-400 font-normal">(opc.)</span></Label>
              <Input value={form.documento} onChange={(e) => set('documento', e.target.value)} placeholder="CC / NIT" maxLength={15} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Teléfono <span className="text-slate-400 font-normal">(opc.)</span></Label>
              <Input value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="300 000 0000" maxLength={15} />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Observaciones <span className="text-slate-400 font-normal">(opc.)</span></Label>
            <Input value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Daño previo, modelo, color…" />
          </div>

          {/* Hora ingreso (informativa) */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="text-xs text-slate-500">Hora de ingreso</span>
            <span className="text-sm font-semibold text-slate-900">{new Date().toLocaleTimeString('es-CO', { timeStyle: 'short' })}</span>
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" className="flex-1 gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />}
              Registrar ingreso
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
