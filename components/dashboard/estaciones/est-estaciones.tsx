'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Loader2, Save, X, Fuel, MapPin, Building2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export type Estacion = {
  id: string; nombre: string; empresa: string | null; ciudad: string | null;
  departamento: string | null; direccion: string | null; telefono: string | null;
  correo: string | null; administrador: string | null; estado: string; created_at: string;
};

const EMPTY = {
  nombre: '', empresa: '', ciudad: '', departamento: '', direccion: '',
  telefono: '', correo: '', administrador: '', estado: 'activa',
};

interface Props {
  estaciones: Estacion[];
  onSelect: (id: string) => void;
  selectedId: string | null;
  onRefresh: () => void;
  islaCount: (id: string) => number;
  surtidorCount: (id: string) => number;
  mangueraCount: (id: string) => number;
}

export function EstEstaciones({ estaciones, onSelect, selectedId, onRefresh, islaCount, surtidorCount, mangueraCount }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Estacion | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (showModal) setForm(editItem ? { nombre: editItem.nombre, empresa: editItem.empresa ?? '', ciudad: editItem.ciudad ?? '', departamento: editItem.departamento ?? '', direccion: editItem.direccion ?? '', telefono: editItem.telefono ?? '', correo: editItem.correo ?? '', administrador: editItem.administrador ?? '', estado: editItem.estado } : EMPTY);
  }, [showModal, editItem]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      if (editItem) {
        const { error } = await supabase.from('estaciones').update(form).eq('id', editItem.id);
        if (error) throw error;
        toast.success('Estación actualizada.');
      } else {
        const { error } = await supabase.from('estaciones').insert(form);
        if (error) throw error;
        toast.success(`Estación "${form.nombre}" creada.`);
      }
      setShowModal(false); onRefresh();
    } catch (err) { toast.error('Error al guardar.'); console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"? Se eliminarán todas sus islas, surtidores y mangueras.`)) return;
    const { error } = await supabase.from('estaciones').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    toast.success('Estación eliminada.');
    onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Estaciones de servicio</h2>
          <p className="text-sm text-slate-500">{estaciones.length} estación{estaciones.length !== 1 ? 'es' : ''} configurada{estaciones.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="gap-2"><Plus className="h-4 w-4" />Nueva estación</Button>
      </div>

      {estaciones.length === 0 ? (
        <EmptyState onAdd={() => { setEditItem(null); setShowModal(true); }} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {['Estación', 'Ubicación', 'Islas', 'Surtidores', 'Mangueras', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estaciones.map((e) => (
                <tr key={e.id} className={cn('group transition-colors hover:bg-blue-50/30', selectedId === e.id && 'bg-blue-50/40')}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', selectedId === e.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600')}>
                        <Fuel className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{e.nombre}</p>
                        <p className="text-xs text-slate-400">{e.empresa || 'Sin empresa'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-700">{e.ciudad || '—'}{e.departamento ? `, ${e.departamento}` : ''}</p>
                    <p className="text-xs text-slate-400">{e.direccion || '—'}</p>
                  </td>
                  <td className="px-5 py-4 text-center"><span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-sm font-semibold text-blue-700">{islaCount(e.id)}</span></td>
                  <td className="px-5 py-4 text-center"><span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-700">{surtidorCount(e.id)}</span></td>
                  <td className="px-5 py-4 text-center"><span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-sm font-semibold text-violet-700">{mangueraCount(e.id)}</span></td>
                  <td className="px-5 py-4">
                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', e.estado === 'activa' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                      {e.estado === 'activa' ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onSelect(e.id)} className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Seleccionar"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => { setEditItem(e); setShowModal(true); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Editar"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(e.id, e.nombre)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><Fuel className="h-4 w-4 text-blue-600" /></span>
              {editItem ? 'Editar estación' : 'Nueva estación de servicio'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <F label="Nombre de la estación *" value={form.nombre} onChange={(v) => set('nombre', v)} placeholder="Terpel Modelia" span2 />
            <F label="Empresa / Marca" value={form.empresa} onChange={(v) => set('empresa', v)} placeholder="Terpel, Biomax, Primax…" />
            <F label="Administrador" value={form.administrador} onChange={(v) => set('administrador', v)} placeholder="Juan García" />
            <F label="Ciudad" value={form.ciudad} onChange={(v) => set('ciudad', v)} placeholder="Bogotá" />
            <F label="Departamento" value={form.departamento} onChange={(v) => set('departamento', v)} placeholder="Cundinamarca" />
            <F label="Dirección" value={form.direccion} onChange={(v) => set('direccion', v)} placeholder="Calle 100 # 15-20" span2 />
            <F label="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} placeholder="+57 601 000 0000" />
            <F label="Correo" type="email" value={form.correo} onChange={(v) => set('correo', v)} placeholder="estacion@empresa.com" />
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold text-slate-600">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set('estado', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="activa">Activa</SelectItem><SelectItem value="inactiva">Inactiva</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editItem ? 'Guardar cambios' : 'Crear estación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white shadow-sm"><Fuel className="h-10 w-10 text-slate-300" /></div>
      <h3 className="mt-5 text-lg font-bold text-slate-700">Sin estaciones configuradas</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">Crea tu primera estación de servicio para comenzar a configurar islas, surtidores y mangueras.</p>
      <Button onClick={onAdd} className="mt-6 gap-2"><Plus className="h-4 w-4" />Agregar primera estación</Button>
    </div>
  );
}

function F({ label, value, onChange, placeholder, type = 'text', span2 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; span2?: boolean }) {
  return (
    <div className={cn('space-y-1.5', span2 && 'col-span-2')}>
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
