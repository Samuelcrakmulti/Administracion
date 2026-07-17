'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, User, Briefcase, Heart, X } from 'lucide-react';
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

type Empleado = {
  id?: string; nombre: string; apellido: string; cargo: string; documento: string;
  email: string; telefono: string; direccion: string; fecha_nacimiento: string;
  fecha_ingreso: string; tipo_contrato: string; salario: number; comision_pct: number;
  estado: string; eps: string; arl: string; banco: string; numero_cuenta: string;
  contacto_emergencia_nombre: string; contacto_emergencia_telefono: string; observaciones: string;
  estacion_id?: string | null;
};

const EMPTY: Empleado = {
  nombre: '', apellido: '', cargo: '', documento: '', email: '', telefono: '',
  direccion: '', fecha_nacimiento: '', fecha_ingreso: new Date().toISOString().split('T')[0],
  tipo_contrato: 'indefinido', salario: 0, comision_pct: 0, estado: 'activo',
  eps: '', arl: '', banco: '', numero_cuenta: '',
  contacto_emergencia_nombre: '', contacto_emergencia_telefono: '', observaciones: '',
};

type Tab = 'personal' | 'laboral' | 'detalle';

interface Props {
  open: boolean;
  empleado: Empleado | null;
  estacionId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EmpleadoModal({ open, empleado, estacionId, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<Tab>('personal');
  const [form, setForm] = useState<Empleado>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(empleado ?? EMPTY);
      setTab('personal');
    }
  }, [open, empleado]);

  const set = (k: keyof Empleado, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.apellido.trim()) {
      toast.error('Nombre y apellido son obligatorios.'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, estacion_id: estacionId };
      if ((payload as Empleado & { id?: string }).id) {
        const { id, ...rest } = payload as Empleado & { id: string };
        const { error } = await supabase.from('rrhh_empleados').update(rest).eq('id', id);
        if (error) throw error;
        toast.success('Empleado actualizado.');
      } else {
        const { error } = await supabase.from('rrhh_empleados').insert(payload);
        if (error) throw error;
        toast.success(`${form.nombre} ${form.apellido} agregado al equipo.`);
      }
      onSuccess(); onClose();
    } catch (err) {
      toast.error('Error al guardar. Intenta de nuevo.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: typeof User }[] = [
    { key: 'personal', label: 'Personal', icon: User },
    { key: 'laboral', label: 'Laboral', icon: Briefcase },
    { key: 'detalle', label: 'Detalles', icon: Heart },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </span>
            {empleado?.id ? 'Editar empleado' : 'Agregar empleado'}
          </DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={cn('flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
                tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700')}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 pt-1">
          {tab === 'personal' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <F label="Nombre *" value={form.nombre} onChange={(v) => set('nombre', v)} placeholder="Juan" />
                <F label="Apellido *" value={form.apellido} onChange={(v) => set('apellido', v)} placeholder="García" />
              </div>
              <F label="Cargo / Posición" value={form.cargo} onChange={(v) => set('cargo', v)} placeholder="Vendedor, Cajero, Administrador…" />
              <div className="grid grid-cols-2 gap-4">
                <F label="Documento" value={form.documento} onChange={(v) => set('documento', v)} placeholder="CC 12345678" />
                <F label="Correo electrónico" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="juan@empresa.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} placeholder="+57 300 000 0000" />
                <F label="Fecha de nacimiento" type="date" value={form.fecha_nacimiento} onChange={(v) => set('fecha_nacimiento', v)} />
              </div>
              <F label="Dirección" value={form.direccion} onChange={(v) => set('direccion', v)} placeholder="Calle 100 # 15-20, Bogotá" />
            </>
          )}

          {tab === 'laboral' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <F label="Fecha de ingreso" type="date" value={form.fecha_ingreso} onChange={(v) => set('fecha_ingreso', v)} />
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Tipo de contrato</Label>
                  <Select value={form.tipo_contrato} onValueChange={(v) => set('tipo_contrato', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                      <SelectItem value="fijo">Término fijo</SelectItem>
                      <SelectItem value="obra">Obra o labor</SelectItem>
                      <SelectItem value="aprendizaje">Aprendizaje (SENA)</SelectItem>
                      <SelectItem value="prestacion">Prestación de servicios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Salario mensual ($)</Label>
                  <Input type="number" min={0} value={form.salario} onChange={(e) => set('salario', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Comisión (%)</Label>
                  <Input type="number" min={0} max={100} step={0.1} value={form.comision_pct} onChange={(e) => set('comision_pct', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Estado</Label>
                <Select value={form.estado} onValueChange={(v) => set('estado', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="vacaciones">En vacaciones</SelectItem>
                    <SelectItem value="licencia">Licencia</SelectItem>
                    <SelectItem value="incapacidad">Incapacidad</SelectItem>
                    <SelectItem value="retirado">Retirado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="EPS" value={form.eps} onChange={(v) => set('eps', v)} placeholder="Sura, Compensar…" />
                <F label="ARL" value={form.arl} onChange={(v) => set('arl', v)} placeholder="Positiva, Sura…" />
              </div>
            </>
          )}

          {tab === 'detalle' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <F label="Banco" value={form.banco} onChange={(v) => set('banco', v)} placeholder="Bancolombia, Davivienda…" />
                <F label="Número de cuenta" value={form.numero_cuenta} onChange={(v) => set('numero_cuenta', v)} placeholder="0123456789" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Contacto de emergencia" value={form.contacto_emergencia_nombre} onChange={(v) => set('contacto_emergencia_nombre', v)} placeholder="María García" />
                <F label="Teléfono emergencia" value={form.contacto_emergencia_telefono} onChange={(v) => set('contacto_emergencia_telefono', v)} placeholder="+57 310 000 0000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Observaciones</Label>
                <textarea value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)}
                  placeholder="Notas adicionales, alergias, habilidades especiales…"
                  rows={3} className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="button" className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {empleado?.id ? 'Guardar cambios' : 'Agregar empleado'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
