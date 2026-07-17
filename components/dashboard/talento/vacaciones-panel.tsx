'use client';

import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, XCircle, Loader2, Calendar, Save } from 'lucide-react';
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

type Empleado = { id: string; nombre: string; apellido: string; cargo: string; fecha_ingreso: string };
type Vacacion = {
  id: string; empleado_id: string; fecha_inicio: string; fecha_fin: string;
  dias: number | null; estado: string; observaciones: string | null; created_at: string;
};

function calcDias(inicio: string, fin: string): number {
  const d1 = new Date(inicio + 'T00:00:00'); const d2 = new Date(fin + 'T00:00:00');
  return Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / 86400000));
}

function diasDisponibles(emp: Empleado, vacaciones: Vacacion[]): number {
  const ingreso = new Date(emp.fecha_ingreso + 'T00:00:00');
  const hoy = new Date();
  const meses = Math.max(0, (hoy.getFullYear() - ingreso.getFullYear()) * 12 + hoy.getMonth() - ingreso.getMonth());
  const devengados = Math.floor((meses / 12) * 15);
  const usados = vacaciones.filter((v) => v.empleado_id === emp.id && v.estado === 'aprobado').reduce((s, v) => s + (v.dias ?? 0), 0);
  return Math.max(0, devengados - usados);
}

interface Props { empleados: Empleado[]; estacionId: string | null }

export function VacacionesPanel({ empleados, estacionId }: Props) {
  const [vacaciones, setVacaciones] = useState<Vacacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ empleado_id: '', fecha_inicio: '', fecha_fin: '', observaciones: '' });
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchVacaciones = async () => {
    setLoading(true);
    let query = supabase.from('rrhh_vacaciones').select('*').order('created_at', { ascending: false });
    if (estacionId) query = query.eq('estacion_id', estacionId);
    const { data } = await query;
    setVacaciones((data as Vacacion[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchVacaciones(); }, []);

  const handleSolicitar = async () => {
    if (!form.empleado_id || !form.fecha_inicio || !form.fecha_fin) {
      toast.error('Completa todos los campos requeridos.'); return;
    }
    if (form.fecha_inicio >= form.fecha_fin) {
      toast.error('La fecha de fin debe ser posterior a la de inicio.'); return;
    }
    setSaving(true);
    try {
      const dias = calcDias(form.fecha_inicio, form.fecha_fin);
      const { error } = await supabase.from('rrhh_vacaciones').insert({ ...form, dias, estado: 'solicitado', estacion_id: estacionId });
      if (error) throw error;
      toast.success('Solicitud de vacaciones registrada.');
      setShowForm(false);
      setForm({ empleado_id: '', fecha_inicio: '', fecha_fin: '', observaciones: '' });
      fetchVacaciones();
    } catch (err) {
      toast.error('Error al solicitar vacaciones.'); console.error(err);
    } finally { setSaving(false); }
  };

  const handleEstado = async (id: string, estado: 'aprobado' | 'rechazado', empId: string) => {
    setApprovingId(id);
    try {
      const { error } = await supabase.from('rrhh_vacaciones').update({ estado }).eq('id', id);
      if (error) throw error;
      if (estado === 'aprobado') {
        await supabase.from('rrhh_empleados').update({ estado: 'vacaciones' }).eq('id', empId);
      }
      toast.success(estado === 'aprobado' ? 'Vacaciones aprobadas.' : 'Solicitud rechazada.');
      fetchVacaciones();
    } catch (err) {
      toast.error('Error al actualizar.'); console.error(err);
    } finally { setApprovingId(null); }
  };

  const ESTADO_CONFIG: Record<string, string> = {
    solicitado: 'bg-amber-50 text-amber-700 border-amber-200',
    aprobado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rechazado: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Gestión de vacaciones</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
          <Plus className="h-4 w-4" />Nueva solicitud
        </Button>
      </div>

      {/* Días disponibles */}
      {empleados.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {empleados.slice(0, 4).map((emp) => (
            <Card key={emp.id} className="p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-slate-900">{emp.nombre}</p>
                  <p className="text-lg font-bold text-primary">{diasDisponibles(emp, vacaciones)}<span className="text-xs font-normal text-slate-400"> días</span></p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Solicitar vacaciones</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-1.5 md:col-span-1">
              <Label className="text-xs font-semibold text-slate-600">Empleado *</Label>
              <Select value={form.empleado_id} onValueChange={(v) => setForm((p) => ({ ...p, empleado_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                <SelectContent>{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre} {e.apellido}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha inicio *</Label>
              <Input type="date" value={form.fecha_inicio} onChange={(e) => setForm((p) => ({ ...p, fecha_inicio: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha fin *</Label>
              <Input type="date" value={form.fecha_fin} onChange={(e) => setForm((p) => ({ ...p, fecha_fin: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observaciones</Label>
              <Input value={form.observaciones} onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))} placeholder="Opcional" />
            </div>
          </div>
          {form.fecha_inicio && form.fecha_fin && form.fecha_inicio < form.fecha_fin && (
            <p className="mt-2 text-xs text-slate-500">
              Duración: <span className="font-semibold text-slate-900">{calcDias(form.fecha_inicio, form.fecha_fin)} días</span>
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSolicitar} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Solicitar
            </Button>
          </div>
        </Card>
      )}

      {/* Requests table */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Solicitudes de vacaciones</h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
        {vacaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Calendar className="h-10 w-10 text-slate-200" />
            <p className="mt-3 text-sm text-slate-400">No hay solicitudes de vacaciones.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Empleado', 'Período', 'Días', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vacaciones.map((v) => {
                  const emp = empleados.find((e) => e.id === v.empleado_id);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {emp?.nombre.charAt(0)}{emp?.apellido.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{emp?.nombre} {emp?.apellido}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(v.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} — {new Date(v.fecha_fin + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">{v.dias ?? '—'} días</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', ESTADO_CONFIG[v.estado] ?? 'bg-slate-100 text-slate-500')}>
                          {v.estado.charAt(0).toUpperCase() + v.estado.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {v.estado === 'solicitado' && (
                          <div className="flex items-center gap-2">
                            <Button size="sm" className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-xs"
                              onClick={() => handleEstado(v.id, 'aprobado', v.empleado_id)} disabled={approvingId === v.id}>
                              <CheckCircle2 className="h-3 w-3" />Aprobar
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1 text-red-600 hover:bg-red-50 text-xs"
                              onClick={() => handleEstado(v.id, 'rechazado', v.empleado_id)} disabled={approvingId === v.id}>
                              <XCircle className="h-3 w-3" />Rechazar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
