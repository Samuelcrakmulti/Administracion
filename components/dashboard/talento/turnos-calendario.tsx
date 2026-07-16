'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Loader2, X, Save, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Empleado = { id: string; nombre: string; apellido: string; cargo: string };
type Turno = {
  id: string; empleado_id: string; fecha: string;
  hora_inicio: string | null; hora_fin: string | null; tipo: string; observaciones: string | null;
};

const TIPO_STYLES: Record<string, string> = {
  manana: 'bg-blue-100 border-blue-200 text-blue-800',
  tarde: 'bg-amber-100 border-amber-200 text-amber-800',
  noche: 'bg-violet-100 border-violet-200 text-violet-800',
  descanso: 'bg-slate-100 border-slate-200 text-slate-600',
};
const TIPO_LABELS: Record<string, string> = {
  manana: 'Mañana', tarde: 'Tarde', noche: 'Noche', descanso: 'Descanso',
};

const DIAS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function getWeekDays(anchor: Date): Date[] {
  const dow = anchor.getDay();
  const mon = new Date(anchor);
  mon.setDate(anchor.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}

function isoDate(d: Date) { return d.toISOString().split('T')[0]; }

interface Props { empleados: Empleado[] }

export function TurnosCalendario({ empleados }: Props) {
  const [anchor, setAnchor] = useState(new Date());
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ empleado_id: '', fecha: isoDate(new Date()), hora_inicio: '08:00', hora_fin: '17:00', tipo: 'manana', observaciones: '' });
  const [saving, setSaving] = useState(false);

  const week = useMemo(() => getWeekDays(anchor), [anchor]);

  const fetchTurnos = async () => {
    setLoading(true);
    const from = isoDate(week[0]); const to = isoDate(week[6]);
    const { data } = await supabase.from('rrhh_turnos').select('*').gte('fecha', from).lte('fecha', to);
    setTurnos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTurnos(); }, [anchor]);

  const prevWeek = () => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); };
  const nextWeek = () => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); };

  const handleSave = async () => {
    if (!form.empleado_id) { toast.error('Selecciona un empleado.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('rrhh_turnos').insert({ ...form, hora_inicio: form.tipo === 'descanso' ? null : form.hora_inicio, hora_fin: form.tipo === 'descanso' ? null : form.hora_fin });
      if (error) throw error;
      toast.success('Turno guardado.');
      setShowForm(false);
      fetchTurnos();
    } catch (err) {
      toast.error('Error al guardar el turno.'); console.error(err);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('rrhh_turnos').delete().eq('id', id);
    toast.success('Turno eliminado.');
    fetchTurnos();
  };

  const weekLabel = `${week[0].getDate()} ${MESES_ES[week[0].getMonth()].slice(0, 3)} — ${week[6].getDate()} ${MESES_ES[week[6].getMonth()].slice(0, 3)}, ${week[0].getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-48 text-center text-sm font-semibold text-slate-900">{weekLabel}</span>
          <Button variant="outline" size="sm" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())} className="text-xs">Hoy</Button>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setForm((p) => ({ ...p, fecha: isoDate(new Date()) })); }} className="gap-1.5">
          <Plus className="h-4 w-4" />Agregar turno
        </Button>
      </div>

      {/* Calendar grid */}
      <Card className="overflow-hidden">
        {loading && (
          <div className="flex h-12 items-center justify-center border-b border-slate-100 bg-slate-50/50">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        )}
        <div className="grid grid-cols-7 divide-x divide-slate-100">
          {week.map((day, i) => {
            const dateStr = isoDate(day);
            const isToday = dateStr === isoDate(new Date());
            const dayTurnos = turnos.filter((t) => t.fecha === dateStr);
            return (
              <div key={i} className="min-h-40">
                {/* Day header */}
                <div className={cn('border-b border-slate-100 px-2 py-2.5 text-center', isToday ? 'bg-primary/5' : 'bg-slate-50/50')}>
                  <p className="text-xs font-medium text-slate-500">{DIAS_ES[(day.getDay())]}</p>
                  <p className={cn('mt-0.5 text-lg font-bold', isToday ? 'text-primary' : 'text-slate-900')}>{day.getDate()}</p>
                </div>
                {/* Shifts */}
                <div className="space-y-1.5 p-2">
                  {dayTurnos.map((t) => {
                    const emp = empleados.find((e) => e.id === t.empleado_id);
                    return (
                      <div key={t.id} className={cn('group relative rounded-lg border px-2.5 py-2 text-xs', TIPO_STYLES[t.tipo] || TIPO_STYLES.manana)}>
                        <button onClick={() => handleDelete(t.id)}
                          className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex">
                          <X className="h-2.5 w-2.5" />
                        </button>
                        <p className="font-semibold leading-tight">{emp ? `${emp.nombre} ${emp.apellido.charAt(0)}.` : '—'}</p>
                        <p className="mt-0.5 text-[10px] opacity-80">
                          {t.tipo === 'descanso' ? 'Descanso' : t.hora_inicio && t.hora_fin ? `${t.hora_inicio.slice(0, 5)}–${t.hora_fin.slice(0, 5)}` : TIPO_LABELS[t.tipo]}
                        </p>
                      </div>
                    );
                  })}
                  {dayTurnos.length === 0 && (
                    <button onClick={() => { setShowForm(true); setForm((p) => ({ ...p, fecha: dateStr })); }}
                      className="flex w-full items-center justify-center rounded-lg border border-dashed border-slate-200 py-3 text-slate-300 transition-all hover:border-primary/40 hover:text-primary/50">
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TIPO_LABELS).map(([k, v]) => (
          <div key={k} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium', TIPO_STYLES[k])}>
            <span className="h-2 w-2 rounded-full" style={{ background: 'currentColor' }} />{v}
          </div>
        ))}
      </div>

      {/* Add turno panel */}
      {showForm && (
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Nuevo turno</h3>
            <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-semibold text-slate-600">Empleado *</Label>
              <Select value={form.empleado_id} onValueChange={(v) => setForm((p) => ({ ...p, empleado_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre} {e.apellido}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Tipo de turno</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manana">Mañana</SelectItem>
                  <SelectItem value="tarde">Tarde</SelectItem>
                  <SelectItem value="noche">Noche</SelectItem>
                  <SelectItem value="descanso">Descanso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo !== 'descanso' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Hora inicio</Label>
                  <Input type="time" value={form.hora_inicio} onChange={(e) => setForm((p) => ({ ...p, hora_inicio: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Hora fin</Label>
                  <Input type="time" value={form.hora_fin} onChange={(e) => setForm((p) => ({ ...p, hora_fin: e.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observaciones</Label>
              <Input value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Guardar turno
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
