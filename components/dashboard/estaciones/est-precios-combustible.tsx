'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Save, Tag, Calendar, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Producto } from '@/components/dashboard/estaciones/est-productos';

type PrecioHistorial = {
  id: string;
  producto_id: string;
  precio_galon: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
  created_at: string;
};

interface Props {
  estacionId: string;
  estacionNombre: string;
  productos: Producto[];
  onRefresh: () => void;
}

export function EstPreciosCombustible({ estacionId, estacionNombre, productos, onRefresh }: Props) {
  const [historial, setHistorial] = useState<PrecioHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ producto_id: '', precio_galon: 0, fecha_inicio: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  const fetchPrecios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('est_precios_combustible')
      .select('*')
      .eq('estacion_id', estacionId)
      .order('fecha_inicio', { ascending: false });
    if (error) { toast.error('Error al cargar precios'); setLoading(false); return; }
    setHistorial((data as PrecioHistorial[]) ?? []);
    setLoading(false);
  }, [estacionId]);

  useEffect(() => { fetchPrecios(); }, [fetchPrecios]);

  const getProducto = (id: string) => productos.find((p) => p.id === id);

  const openNew = () => {
    setForm({ producto_id: productos[0]?.id ?? '', precio_galon: 0, fecha_inicio: new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.producto_id) { toast.error('Selecciona un combustible.'); return; }
    if (form.precio_galon <= 0) { toast.error('El precio debe ser mayor a 0.'); return; }
    setSaving(true);
    try {
      await supabase.from('est_precios_combustible')
        .update({ fecha_fin: form.fecha_inicio, activo: false })
        .eq('estacion_id', estacionId)
        .eq('producto_id', form.producto_id)
        .eq('activo', true);

      const { error } = await supabase.from('est_precios_combustible').insert({
        estacion_id: estacionId,
        producto_id: form.producto_id,
        precio_galon: form.precio_galon,
        fecha_inicio: form.fecha_inicio,
        activo: true,
      });
      if (error) throw error;

      toast.success('Precio actualizado correctamente.');
      setShowModal(false);
      fetchPrecios();
      onRefresh();
    } catch (err) { toast.error('Error al guardar el precio.'); console.error(err); }
    finally { setSaving(false); }
  };

  const preciosPorProducto = historial.reduce<Record<string, PrecioHistorial[]>>((acc, h) => {
    if (!acc[h.producto_id]) acc[h.producto_id] = [];
    acc[h.producto_id].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Historial de Precios</h2>
          <p className="text-sm text-slate-500">{estacionNombre} — Precios por galón</p>
        </div>
        <Button onClick={openNew} className="gap-2" disabled={productos.length === 0}><Plus className="h-4 w-4" />Nuevo precio</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>
      ) : Object.keys(preciosPorProducto).length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Tag className="h-12 w-12 text-slate-200" />
          <p className="mt-4 text-base font-semibold text-slate-600">No hay precios registrados</p>
          <p className="mt-1 text-sm text-slate-400">Registra el precio por galón de cada combustible.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Object.entries(preciosPorProducto).map(([prodId, precios]) => {
            const prod = getProducto(prodId);
            const activo = precios.find((p) => p.activo);
            return (
              <Card key={prodId} className="overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: prod?.color ?? '#94a3b8' }} />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: (prod?.color ?? '#94a3b8') + '20' }}>
                        <Tag className="h-4 w-4" style={{ color: prod?.color ?? '#94a3b8' }} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{prod?.nombre ?? 'Desconocido'}</p>
                        <p className="text-xs text-slate-400">{precios.length} registro{precios.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {activo && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">${activo.precio_galon.toLocaleString('es-CO')}</p>
                        <p className="text-[10px] text-slate-400">por galón</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    {precios.slice(0, 8).map((p) => (
                      <div key={p.id} className={cn('flex items-center justify-between rounded-lg px-3 py-2 text-xs', p.activo ? 'bg-emerald-50' : 'bg-slate-50')}>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-700">{p.fecha_inicio}{p.fecha_fin ? ` → ${p.fecha_fin}` : ' → actual'}</span>
                        </div>
                        <span className={cn('font-bold', p.activo ? 'text-emerald-600' : 'text-slate-600')}>${p.precio_galon.toLocaleString('es-CO')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(v) => { if (!v) setShowModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50"><Tag className="h-4 w-4 text-amber-600" /></span>
              Nuevo precio por galón
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Combustible *</Label>
              <Select value={form.producto_id} onValueChange={(v) => setForm((p) => ({ ...p, producto_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>
                  {productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Precio por galón ($)</Label>
              <Input type="number" min={0} step={1} value={form.precio_galon} onChange={(e) => setForm((p) => ({ ...p, precio_galon: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha de inicio</Label>
              <Input type="date" value={form.fecha_inicio} onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))} />
            </div>
            <p className="text-xs text-slate-400">El precio anterior se cerrará automáticamente con esta fecha de fin.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</Button>
            <Button className="flex-1 gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar precio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
