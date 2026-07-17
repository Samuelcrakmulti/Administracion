'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Loader2, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Empleado = { id: string; nombre: string; apellido: string; cargo: string };
type Asistencia = {
  id?: string; empleado_id: string; fecha: string; hora_entrada: string | null;
  hora_salida: string | null; horas_trabajadas: number | null; estado: string; observaciones: string | null;
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  a_tiempo: { label: 'A tiempo', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  tarde: { label: 'Tarde', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertCircle },
  ausente: { label: 'Ausente', color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle },
};

function isoDate(d: Date) { return d.toISOString().split('T')[0]; }

function calcHoras(entrada: string | null, salida: string | null): number | null {
  if (!entrada || !salida) return null;
  const [h1, m1] = entrada.split(':').map(Number);
  const [h2, m2] = salida.split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60);
}

interface Props { empleados: Empleado[]; estacionId: string | null }

export function AsistenciaPanel({ empleados, estacionId }: Props) {
  const [fecha, setFecha] = useState(isoDate(new Date()));
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchAsistencias = async () => {
    setLoading(true);
    let query = supabase.from('rrhh_asistencia').select('*').eq('fecha', fecha);
    if (estacionId) query = query.eq('estacion_id', estacionId);
    const { data } = await query;
    setAsistencias(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAsistencias(); }, [fecha]);

  const changeDate = (days: number) => {
    const d = new Date(fecha + 'T00:00:00'); d.setDate(d.getDate() + days);
    setFecha(isoDate(d));
  };

  const getOrCreate = (empId: string): Asistencia => {
    return asistencias.find((a) => a.empleado_id === empId) ?? {
      empleado_id: empId, fecha, hora_entrada: null, hora_salida: null,
      horas_trabajadas: null, estado: 'a_tiempo', observaciones: null,
    };
  };

  const updateLocal = (empId: string, patch: Partial<Asistencia>) => {
    setAsistencias((prev) => {
      const exists = prev.find((a) => a.empleado_id === empId);
      if (exists) return prev.map((a) => a.empleado_id === empId ? { ...a, ...patch } : a);
      return [...prev, { ...getOrCreate(empId), ...patch }];
    });
  };

  const saveAsistencia = async (empId: string) => {
    setSavingId(empId);
    try {
      const record = getOrCreate(empId);
      const horas = calcHoras(record.hora_entrada, record.hora_salida);
      const payload = { ...record, horas_trabajadas: horas, estacion_id: estacionId };
      if (record.id) {
        const { error } = await supabase.from('rrhh_asistencia').update(payload).eq('id', record.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('rrhh_asistencia').insert(payload).select('id').single();
        if (error) throw error;
        if (data) updateLocal(empId, { id: data.id });
      }
      updateLocal(empId, { horas_trabajadas: horas });
      toast.success('Asistencia guardada.');
    } catch (err) {
      toast.error('Error al guardar la asistencia.'); console.error(err);
    } finally { setSavingId(null); }
  };

  const marcarAusente = async (empId: string) => {
    updateLocal(empId, { estado: 'ausente', hora_entrada: null, hora_salida: null });
    await saveAsistencia(empId);
  };

  const isToday = fecha === isoDate(new Date());
  const totalPresentes = asistencias.filter((a) => a.estado !== 'ausente' && a.hora_entrada).length;
  const totalAusentes = asistencias.filter((a) => a.estado === 'ausente').length;
  const totalHoras = asistencias.reduce((s, a) => s + (a.horas_trabajadas ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => changeDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="rounded-xl border border-input bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-primary focus:outline-none" />
          <Button variant="outline" size="sm" onClick={() => changeDate(1)} disabled={isToday}><ChevronRight className="h-4 w-4" /></Button>
          {!isToday && <Button variant="outline" size="sm" onClick={() => setFecha(isoDate(new Date()))} className="text-xs">Hoy</Button>}
        </div>
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="text-emerald-600 font-medium">{totalPresentes} presentes</span>
          <span className="text-red-500 font-medium">{totalAusentes} ausentes</span>
          <span><Clock className="mr-1 inline-block h-3 w-3" />{totalHoras.toFixed(1)}h totales</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{totalPresentes}</p>
          <p className="mt-1 text-xs text-slate-500">Presentes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{totalAusentes}</p>
          <p className="mt-1 text-xs text-slate-500">Ausentes</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalHoras.toFixed(1)}h</p>
          <p className="mt-1 text-xs text-slate-500">Horas trabajadas</p>
        </Card>
      </div>

      {/* Attendance table */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Registro de asistencia</h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
        {empleados.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Sin empleados registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Empleado', 'Cargo', 'Entrada', 'Salida', 'Horas', 'Estado', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {empleados.filter((e) => true).map((emp) => {
                  const rec = getOrCreate(emp.id);
                  const ec = ESTADO_CONFIG[rec.estado] ?? ESTADO_CONFIG.a_tiempo;
                  const horas = calcHoras(rec.hora_entrada, rec.hora_salida);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {emp.nombre.charAt(0)}{emp.apellido.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{emp.nombre} {emp.apellido}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{emp.cargo}</td>
                      <td className="px-4 py-3">
                        <Input type="time" value={rec.hora_entrada ?? ''} disabled={rec.estado === 'ausente'}
                          onChange={(e) => updateLocal(emp.id, { hora_entrada: e.target.value || null })}
                          className="w-28 text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <Input type="time" value={rec.hora_salida ?? ''} disabled={rec.estado === 'ausente'}
                          onChange={(e) => updateLocal(emp.id, { hora_salida: e.target.value || null })}
                          className="w-28 text-sm" />
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {horas !== null ? `${horas.toFixed(1)}h` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <select value={rec.estado} onChange={(e) => updateLocal(emp.id, { estado: e.target.value })}
                          className={cn('rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none', ec.color)}>
                          <option value="a_tiempo">A tiempo</option>
                          <option value="tarde">Tarde</option>
                          <option value="ausente">Ausente</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
                            onClick={() => saveAsistencia(emp.id)} disabled={savingId === emp.id}>
                            {savingId === emp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Guardar
                          </Button>
                        </div>
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
