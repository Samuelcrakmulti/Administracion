'use client';

import { useState, useEffect } from 'react';
import { Car, Bike, Truck, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

function nowDateStr() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}
function nowTimeStr() {
  return new Date().toTimeString().split(' ')[0].slice(0, 5);
}

interface Props {
  open: boolean;
  estacionId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ParqIngresoModal({ open, estacionId, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    placa: '',
    tipo_vehiculo: 'automovil',
    marca: '',
    color: '',
    nombre_conductor: '',
    documento: '',
    telefono: '',
    espacio: '',
    responsable: '',
    observaciones: '',
    fecha_ingreso: nowDateStr(),
    hora_ingreso: nowTimeStr(),
  });

  useEffect(() => {
    if (open) {
      setForm((p) => ({ ...p, fecha_ingreso: nowDateStr(), hora_ingreso: nowTimeStr() }));
    }
  }, [open]);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.placa.trim()) { toast.error('Ingresa la placa del vehículo.'); return; }
    if (!estacionId) { toast.error('Selecciona una estación.'); return; }

    // Validate fecha/hora
    const ingresoISO = new Date(`${form.fecha_ingreso}T${form.hora_ingreso}`).toISOString();
    if (isNaN(new Date(ingresoISO).getTime())) { toast.error('Fecha u hora de ingreso inválida.'); return; }

    // Check for duplicate active vehicle
    const { data: existing } = await supabase
      .from('parqueadero_registros')
      .select('id')
      .eq('placa', form.placa.trim().toUpperCase())
      .eq('estado', 'activo')
      .eq('estacion_id', estacionId)
      .maybeSingle();
    if (existing) { toast.error('Ya existe un vehículo activo con esa placa en esta estación.'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.from('parqueadero_registros').insert({
        estacion_id: estacionId,
        placa: form.placa.trim().toUpperCase(),
        tipo_vehiculo: form.tipo_vehiculo,
        marca: form.marca.trim() || null,
        color: form.color.trim() || null,
        nombre_conductor: form.nombre_conductor.trim() || null,
        documento: form.documento.trim() || null,
        telefono: form.telefono.trim() || null,
        espacio: form.espacio.trim() || null,
        responsable: form.responsable.trim() || null,
        observaciones: form.observaciones.trim() || null,
        hora_ingreso: ingresoISO,
        estado: 'activo',
      });
      if (error) throw error;
      toast.success(`Vehículo ${form.placa.toUpperCase()} registrado.`);
      setForm({ placa: '', tipo_vehiculo: 'automovil', marca: '', color: '', nombre_conductor: '', documento: '', telefono: '', espacio: '', responsable: '', observaciones: '', fecha_ingreso: nowDateStr(), hora_ingreso: nowTimeStr() });
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

          {/* Marca + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Marca <span className="text-slate-400 font-normal">(opc.)</span></Label>
              <Input value={form.marca} onChange={(e) => set('marca', e.target.value)} placeholder="Mazda, Renault…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Color <span className="text-slate-400 font-normal">(opc.)</span></Label>
              <Input value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Rojo, Negro…" />
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

          {/* Responsable */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Responsable del registro <span className="text-slate-400 font-normal">(opc.)</span></Label>
            <Input value={form.responsable} onChange={(e) => set('responsable', e.target.value)} placeholder="Nombre de quien registra" />
          </div>

          {/* Observaciones */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Observaciones <span className="text-slate-400 font-normal">(opc.)</span></Label>
            <Input value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Daño previo, modelo, color…" />
          </div>

          {/* Fecha y hora de ingreso manuales */}
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold text-slate-600">Fecha y hora de ingreso <span className="text-slate-400 font-normal">(editable)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Fecha</Label>
                <Input type="date" value={form.fecha_ingreso} onChange={(e) => set('fecha_ingreso', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">Hora</Label>
                <Input type="time" value={form.hora_ingreso} onChange={(e) => set('hora_ingreso', e.target.value)} />
              </div>
            </div>
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
