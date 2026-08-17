'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Loader2, Building2, Calendar, Clock, User, ClipboardList,
  ChevronRight, AlertTriangle, FileText, Search, RefreshCw, ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Estacion } from './est-estaciones';
import { EstCierreDetalle, type Cierre } from './est-cierre-detalle';
import type { Isla, Surtidor, Manguera, Producto } from './est-cierre-lecturas';

type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
  cargo: string;
  documento: string | null;
  estacion_id: string | null;
};

const TURNOS_DEFAULT = ['Turno 1', 'Turno 2', 'Turno 3'];

const ESTADOS = [
  { value: 'borrador', label: 'Borrador', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  { value: 'en_proceso', label: 'En Proceso', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { value: 'pendiente_revision', label: 'Pendiente Revisión', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  { value: 'cerrado', label: 'Cerrado', color: 'bg-slate-800 text-white border-slate-800', dot: 'bg-slate-300' },
];

const estadoInfo = (val: string) => ESTADOS.find((e) => e.value === val) ?? ESTADOS[0];

interface Props {
  estacion: Estacion;
  islas: Isla[];
  surtidores: Surtidor[];
  mangueras: Manguera[];
  productos: Producto[];
  onRefresh: () => void;
}

export function EstCierreOperativo({ estacion, islas, surtidores, mangueras, productos, onRefresh }: Props) {
  const { user } = useAuth();
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCierre, setSelectedCierre] = useState<Cierre | null>(null);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Form state
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    turno_label: 'Turno 1',
    empleado_id: '',
    observaciones: '',
  });
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<Cierre | null>(null);

  const fetchCierres = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('est_cierres')
      .select('*')
      .eq('estacion_id', estacion.id)
      .order('fecha', { ascending: false })
      .order('turno_label', { ascending: true });
    setCierres((data as Cierre[]) ?? []);
    setLoading(false);
  }, [estacion.id]);

  const fetchEmpleados = useCallback(async () => {
    setLoadingEmpleados(true);
    // Empleados asignados a esta estación o sin estación (flexibles)
    const { data } = await supabase
      .from('rrhh_empleados')
      .select('id, nombre, apellido, cargo, documento, estacion_id')
      .or(`estacion_id.eq.${estacion.id},estacion_id.is.null`)
      .eq('estado', 'activo')
      .order('nombre');
    setEmpleados((data as Empleado[]) ?? []);
    setLoadingEmpleados(false);
  }, [estacion.id]);

  useEffect(() => {
    fetchCierres();
  }, [fetchCierres]);

  useEffect(() => {
    if (showForm) {
      fetchEmpleados();
      setDuplicateWarning(null);
      setForm({
        fecha: new Date().toISOString().split('T')[0],
        turno_label: 'Turno 1',
        empleado_id: '',
        observaciones: '',
      });
    }
  }, [showForm, fetchEmpleados]);

  // Check for duplicates when form changes
  useEffect(() => {
    if (!showForm) return;
    const existing = cierres.find(
      (c) => c.fecha === form.fecha && c.turno_label === form.turno_label
    );
    setDuplicateWarning(existing ?? null);
  }, [form.fecha, form.turno_label, cierres, showForm]);

  const handleCreate = async () => {
    if (!form.fecha) { toast.error('La fecha es obligatoria.'); return; }
    if (!form.turno_label) { toast.error('El turno es obligatorio.'); return; }

    if (duplicateWarning) {
      toast.error('Ya existe un cierre para esta fecha y turno. Abre el existente o elige otra combinación.');
      return;
    }

    setSaving(true);
    try {
      const empleado = empleados.find((e) => e.id === form.empleado_id);
      const insertData: Record<string, unknown> = {
        estacion_id: estacion.id,
        fecha: form.fecha,
        turno_label: form.turno_label,
        estado: 'borrador',
        observaciones: form.observaciones || null,
        created_by: user?.email ?? null,
        updated_by: user?.email ?? null,
      };
      if (empleado) {
        insertData.empleado_id = empleado.id;
        insertData.empleado_nombre = `${empleado.nombre} ${empleado.apellido}`.trim();
        insertData.empleado_cargo = empleado.cargo || null;
        insertData.empleado_documento = empleado.documento || null;
      }

      const { data: newCierre, error } = await supabase
        .from('est_cierres')
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;

      // Registrar auditoría de creación
      await supabase.from('est_cierre_auditoria').insert({
        cierre_id: newCierre.id,
        accion: 'creacion',
        estado_nuevo: 'borrador',
        usuario: user?.email ?? 'Sistema',
      });

      toast.success('Cierre operativo creado.');
      setShowForm(false);
      await fetchCierres();
      onRefresh();
      setSelectedCierre(newCierre as Cierre);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      if (e?.code === '23505') {
        toast.error('Ya existe un cierre para esta estación, fecha y turno.');
      } else {
        toast.error('Error al crear el cierre.');
      }
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleBackToList = async () => {
    setSelectedCierre(null);
    await fetchCierres();
    onRefresh();
  };

  // Detail view
  if (selectedCierre) {
    return (
      <EstCierreDetalle
        cierre={selectedCierre}
        estacion={estacion}
        islas={islas}
        surtidores={surtidores}
        mangueras={mangueras}
        productos={productos}
        onBack={handleBackToList}
        onRefresh={fetchCierres}
      />
    );
  }

  // Filtered list
  const filtered = cierres.filter((c) => {
    const matchSearch = search === '' ||
      c.turno_label.toLowerCase().includes(search.toLowerCase()) ||
      (c.empleado_nombre ?? '').toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Cierre Operativo — {estacion.nombre}</h2>
          <p className="text-sm text-slate-500">Registros maestros de operación por turno</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchCierres} className="gap-2">
            <RefreshCw className="h-4 w-4" />Actualizar
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2 bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4" />Nuevo Cierre Operativo
          </Button>
        </div>
      </div>

      {/* Filters */}
      {cierres.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por turno o empleado..."
              className="pl-9"
            />
          </div>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {ESTADOS.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
      ) : cierres.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <ClipboardList className="h-8 w-8 text-amber-300" />
          </div>
          <h3 className="mt-5 text-base font-bold text-slate-700">No hay cierres operativos</h3>
          <p className="mt-1.5 text-sm text-slate-400 max-w-sm">Crea el primer cierre operativo para registrar la operación de un turno en esta estación.</p>
          <Button onClick={() => setShowForm(true)} className="mt-5 gap-2 bg-amber-600 hover:bg-amber-700">
            <Plus className="h-4 w-4" />Nuevo Cierre Operativo
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-slate-400">No se encontraron cierres con los filtros aplicados.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const eInfo = estadoInfo(c.estado);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCierre(c)}
                className="group text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{c.turno_label}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(c.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap', eInfo.color)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', eInfo.dot)} />
                    {eInfo.label}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{c.empleado_nombre ?? 'Sin asignar'}</span>
                  </div>
                  {c.empleado_cargo && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{c.empleado_cargo}</span>
                    </div>
                  )}
                  {c.observaciones && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      <span className="truncate">{c.observaciones}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] text-slate-400">
                    {new Date(c.created_at).toLocaleDateString('es-CO')}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Abrir <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Creation dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
                <ClipboardList className="h-4 w-4 text-amber-600" />
              </span>
              Nuevo Cierre Operativo
            </DialogTitle>
            <DialogDescription>
              Estación: <strong className="text-slate-700">{estacion.nombre}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 pt-2">
            {/* Fecha */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Fecha *</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
              />
              <p className="text-[11px] text-slate-400">Por defecto la fecha actual, pero puedes modificarla.</p>
            </div>

            {/* Turno */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Turno *</Label>
              <Select
                value={form.turno_label}
                onValueChange={(v) => setForm((p) => ({ ...p, turno_label: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TURNOS_DEFAULT.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Empleado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Empleado responsable</Label>
              {loadingEmpleados ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />Cargando empleados...
                </div>
              ) : empleados.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                  No hay empleados activos asignados a esta estación.
                  Puedes crear el cierre sin empleado y asignarlo después.
                </div>
              ) : (
                <Select
                  value={form.empleado_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, empleado_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                  <SelectContent>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>{emp.nombre} {emp.apellido}</span>
                          {emp.cargo && <span className="text-slate-400 text-xs">· {emp.cargo}</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {form.empleado_id && (() => {
                const emp = empleados.find((e) => e.id === form.empleado_id);
                if (!emp) return null;
                return (
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-xs">
                    <div className="flex items-center gap-4">
                      <span><span className="text-slate-400">Cargo:</span> <strong className="text-slate-700">{emp.cargo || '—'}</strong></span>
                      <span><span className="text-slate-400">Documento:</span> <strong className="text-slate-700">{emp.documento || '—'}</strong></span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Observaciones (opcional)</Label>
              <Textarea
                value={form.observaciones}
                onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
                rows={3}
                placeholder="Novedades o comentarios iniciales..."
              />
            </div>

            {/* Duplicate warning */}
            {duplicateWarning && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-800">Ya existe un cierre para esta fecha y turno</p>
                    <p className="mt-1 text-xs text-amber-700">
                      {duplicateWarning.turno_label} · {new Date(duplicateWarning.fecha + 'T00:00:00').toLocaleDateString('es-CO')} · Estado: {estadoInfo(duplicateWarning.estado).label}
                    </p>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setSelectedCierre(duplicateWarning);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 underline hover:text-amber-900"
                    >
                      Abrir cierre existente <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2 bg-amber-600 hover:bg-amber-700"
              onClick={handleCreate}
              disabled={saving || !!duplicateWarning}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Crear cierre
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
