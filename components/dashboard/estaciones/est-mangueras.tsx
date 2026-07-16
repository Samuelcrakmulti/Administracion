'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader2, Save, Droplet, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Isla } from './est-islas';
import type { Surtidor } from './est-surtidores';
import type { Producto } from './est-productos';

export type Manguera = {
  id: string; surtidor_id: string; isla_id: string; estacion_id: string;
  numero: number; nombre: string; producto_id: string | null;
  color: string; estado: string; observaciones: string | null;
};

const EMPTY = { surtidor_id: '', numero: 1, nombre: '', producto_id: '', color: '#94a3b8', estado: 'activa', observaciones: '' };

interface Props {
  estacionId: string; estacionNombre: string;
  islas: Isla[]; surtidores: Surtidor[];
  mangueras: Manguera[]; productos: Producto[];
  onRefresh: () => void;
}

export function EstMangueras({ estacionId, estacionNombre, islas, surtidores, mangueras, productos, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Manguera | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filterSurtidor, setFilterSurtidor] = useState<string>('todos');

  useEffect(() => {
    if (showModal) setForm(editItem ? {
      surtidor_id: editItem.surtidor_id, numero: editItem.numero, nombre: editItem.nombre,
      producto_id: editItem.producto_id ?? '', color: editItem.color, estado: editItem.estado, observaciones: editItem.observaciones ?? '',
    } : { ...EMPTY, surtidor_id: surtidores[0]?.id ?? '' });
  }, [showModal, editItem, surtidores]);

  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const handleProductChange = (productId: string) => {
    const prod = productos.find((p) => p.id === productId);
    set('producto_id', productId);
    if (prod) set('color', prod.color);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.surtidor_id) { toast.error('Nombre y surtidor son obligatorios.'); return; }
    setSaving(true);
    try {
      const surt = surtidores.find((s) => s.id === form.surtidor_id);
      const payload = { ...form, estacion_id: estacionId, isla_id: surt?.isla_id ?? '', numero: Number(form.numero), producto_id: form.producto_id || null };
      if (editItem) {
        const { error } = await supabase.from('est_mangueras').update(payload).eq('id', editItem.id);
        if (error) throw error; toast.success('Manguera actualizada.');
      } else {
        const { error } = await supabase.from('est_mangueras').insert(payload);
        if (error) throw error; toast.success(`Manguera "${form.nombre}" creada.`);
      }
      setShowModal(false); onRefresh();
    } catch (err) { toast.error('Error al guardar.'); console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar manguera "${nombre}"?`)) return;
    const { error } = await supabase.from('est_mangueras').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar.'); return; }
    toast.success('Manguera eliminada.'); onRefresh();
  };

  const filteredSurtidores = filterSurtidor === 'todos' ? surtidores : surtidores.filter((s) => s.id === filterSurtidor);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Mangueras — {estacionNombre}</h2>
          <p className="text-sm text-slate-500">{mangueras.length} manguera{mangueras.length !== 1 ? 's' : ''} configurada{mangueras.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterSurtidor} onValueChange={setFilterSurtidor}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los surtidores</SelectItem>
              {surtidores.map((s) => {
                const isla = islas.find((i) => i.id === s.isla_id);
                return <SelectItem key={s.id} value={s.id}>{isla?.nombre} — {s.nombre}</SelectItem>;
              })}
            </SelectContent>
          </Select>
          <Button onClick={() => { setEditItem(null); setShowModal(true); }} className="gap-2"><Plus className="h-4 w-4" />Agregar manguera</Button>
        </div>
      </div>

      {surtidores.length === 0 ? (
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-6 text-center">
          <p className="text-sm font-medium text-amber-800">Primero debes crear surtidores antes de agregar mangueras.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {islas.sort((a, b) => a.orden - b.orden).map((isla) => {
            const islaSurtidores = filteredSurtidores.filter((s) => s.isla_id === isla.id);
            if (islaSurtidores.length === 0) return null;
            return (
              <div key={isla.id}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ background: isla.color }} />
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{isla.nombre}</h3>
                </div>
                <div className="space-y-4">
                  {islaSurtidores.sort((a, b) => a.numero - b.numero).map((surt) => {
                    const surtMangueras = mangueras.filter((m) => m.surtidor_id === surt.id);
                    return (
                      <div key={surt.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-bold">S{surt.numero}</div>
                            <span className="text-sm font-semibold text-slate-900">{surt.nombre}</span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{surtMangueras.length} mangueras</span>
                          </div>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setEditItem(null); setForm((p) => ({ ...p, surtidor_id: surt.id })); setShowModal(true); }}>
                            <Plus className="h-3 w-3" />Manguera
                          </Button>
                        </div>
                        {surtMangueras.length === 0 ? (
                          <div className="px-5 py-6 text-center text-sm text-slate-400">Sin mangueras — agrega la primera.</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {surtMangueras.sort((a, b) => a.numero - b.numero).map((m) => {
                              const prod = productos.find((p) => p.id === m.producto_id);
                              return (
                                <div key={m.id} className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 p-3 transition-all hover:border-slate-200 hover:shadow-sm">
                                  <div className={cn('flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-sm border-4 border-white shadow-md transition-transform group-hover:scale-110', m.estado !== 'activa' && 'opacity-50')}
                                    style={{ background: m.color }}>
                                    M{m.numero}
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs font-semibold text-slate-900">{m.nombre}</p>
                                    <p className="text-[10px] text-slate-400 leading-tight">{prod?.nombre ?? 'Sin asignar'}</p>
                                  </div>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => { setEditItem(m); setShowModal(true); }} className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors"><Edit2 className="h-3 w-3" /></button>
                                    <button onClick={() => handleDelete(m.id, m.nombre)} className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-3 w-3" /></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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

      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50"><Droplet className="h-4 w-4 text-blue-600" /></span>
              {editItem ? 'Editar manguera' : 'Nueva manguera'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Surtidor *</Label>
              <Select value={form.surtidor_id} onValueChange={(v) => set('surtidor_id', v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {surtidores.map((s) => {
                    const isla = islas.find((i) => i.id === s.isla_id);
                    return <SelectItem key={s.id} value={s.id}>{isla?.nombre} · {s.nombre}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Manguera 1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Número</Label>
              <Input type="number" min={1} value={form.numero} onChange={(e) => set('numero', parseInt(e.target.value) || 1)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Producto / Combustible <Link2 className="inline h-3 w-3 ml-1 text-blue-500" /></Label>
              <Select value={form.producto_id || 'sin_asignar'} onValueChange={(v) => v === 'sin_asignar' ? set('producto_id', '') : handleProductChange(v)}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                  {productos.filter((p) => p.estado === 'activo').map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full inline-block" style={{ background: p.color }} />{p.nombre}</div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set('estado', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Color (manual)</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="h-10 w-12 cursor-pointer rounded-xl border border-slate-200 p-1" />
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-md text-white text-xs font-bold" style={{ background: form.color }}>M</div>
              </div>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observaciones</Label>
              <Input value={form.observaciones} onChange={(e) => set('observaciones', e.target.value)} placeholder="Notas opcionales" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editItem ? 'Guardar' : 'Crear manguera'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
