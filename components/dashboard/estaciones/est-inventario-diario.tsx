'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, ClipboardCheck, ClipboardList, Clock, User, Fuel } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Tanque } from '@/components/dashboard/estaciones/est-tanques';
import type { Producto } from '@/components/dashboard/estaciones/est-productos';

interface Props {
  estacionId: string;
  estacionNombre: string;
  tanques: Tanque[];
  productos: Producto[];
  tipo: 'inicial' | 'final';
  onRefresh: () => void;
}

export function EstInventarioDiario({ estacionId, estacionNombre, tanques, productos, tipo, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [niveles, setNiveles] = useState<Record<string, string>>({});
  const [responsable, setResponsable] = useState('');
  const [hora, setHora] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [hoyRegistrado, setHoyRegistrado] = useState(false);

  const hoy = new Date().toISOString().split('T')[0];

  const checkHoy = useCallback(async () => {
    const { data } = await supabase
      .from('est_inventario_diario')
      .select('id')
      .eq('estacion_id', estacionId)
      .eq('fecha', hoy)
      .eq('tipo', tipo)
      .limit(1);
    setHoyRegistrado((data?.length ?? 0) > 0);
  }, [estacionId, hoy, tipo]);

  useEffect(() => {
    const init: Record<string, string> = {};
    tanques.forEach((t) => { init[t.id] = String(t.nivel_actual_galones ?? 0); });
    setNiveles(init);
    const now = new Date();
    setHora(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    checkHoy();
  }, [tanques, checkHoy]);

  const getProducto = (id: string | null) => productos.find((p) => p.id === id);

  const handleSave = async () => {
    if (!responsable.trim()) { toast.error('El responsable es obligatorio.'); return; }
    if (tanques.length === 0) { toast.error('No hay tanques configurados.'); return; }
    setSaving(true);
    try {
      const registros = tanques.map((t) => ({
        estacion_id: estacionId,
        tanque_id: t.id,
        producto_id: t.producto_id,
        fecha: hoy,
        tipo,
        nivel_galones: parseFloat(niveles[t.id] || '0') || 0,
        responsable: responsable,
        hora: hora || null,
        observaciones: observaciones || null,
      }));

      const { error } = await supabase.from('est_inventario_diario').insert(registros);
      if (error) throw error;

      const updates = tanques.map((t) => {
        const nivel = parseFloat(niveles[t.id] || '0') || 0;
        return supabase.from('est_tanques').update({ nivel_actual_galones: nivel, updated_at: new Date().toISOString() }).eq('id', t.id);
      });
      await Promise.all(updates);

      toast.success(`Inventario ${tipo} registrado correctamente.`);
      setHoyRegistrado(true);
      onRefresh();
    } catch (err) { toast.error('Error al guardar el inventario.'); console.error(err); }
    finally { setSaving(false); }
  };

  const titulo = tipo === 'inicial' ? 'Inventario Inicial' : 'Inventario Final';
  const desc = tipo === 'inicial' ? 'Registro del nivel de cada tanque al inicio del día' : 'Registro del nivel de cada tanque al final de la jornada';
  const Icon = tipo === 'inicial' ? ClipboardList : ClipboardCheck;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
        <p className="text-sm text-slate-500">{estacionNombre} — {desc}</p>
      </div>

      {tanques.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <Fuel className="h-12 w-12 text-slate-200" />
          <p className="mt-4 text-base font-semibold text-slate-600">No hay tanques configurados</p>
          <p className="mt-1 text-sm text-slate-400">Configura tanques antes de registrar inventario.</p>
        </div>
      ) : (
        <>
          <Card className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><User className="h-3 w-3" />Responsable *</Label>
                <Input value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Nombre del responsable" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5"><Clock className="h-3 w-3" />Hora</Label>
                <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Fecha</Label>
                <Input value={hoy} disabled />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tanques.map((t) => {
              const prod = getProducto(t.producto_id);
              const val = parseFloat(niveles[t.id] || '0') || 0;
              const pct = t.capacidad_maxima_galones > 0 ? (val / t.capacidad_maxima_galones) * 100 : 0;
              return (
                <Card key={t.id} className="overflow-hidden">
                  <div className="h-1.5 w-full" style={{ background: prod?.color ?? '#94a3b8' }} />
                  <div className="p-5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-white shadow-sm" style={{ background: prod?.color ?? '#94a3b8' }}>
                        <Fuel className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.nombre}</p>
                        <p className="text-xs text-slate-400">{prod?.nombre ?? 'Sin producto'}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-600">Nivel actual (galones)</Label>
                      <Input type="number" min={0} step={0.01} value={niveles[t.id] ?? ''} onChange={(e) => setNiveles((p) => ({ ...p, [t.id]: e.target.value }))} />
                    </div>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={cn('h-full rounded-full', pct < 10 ? 'bg-red-500' : pct < 30 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">{pct.toFixed(1)}% de {t.capacidad_maxima_galones.toLocaleString('es-CO')} gal</p>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observaciones</Label>
              <Input value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas sobre el inventario…" />
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            <Button className="gap-2" onClick={handleSave} disabled={saving || hoyRegistrado}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {hoyRegistrado ? 'Ya registrado hoy' : `Guardar inventario ${tipo}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
