'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  History, RotateCcw, Loader2, CheckCircle2, AlertTriangle,
  FileSpreadsheet, Calendar, User, Database, XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type ImportBatch = {
  id: string;
  user_email: string;
  estacion_id: string | null;
  tipo_importacion: string;
  nombre_archivo: string;
  tamano_archivo: number;
  hoja_seleccionada: string | null;
  total_filas: number;
  registros_importados: number;
  registros_omitidos: number;
  registros_error: number;
  registros_advertencia: number;
  duplicados: number;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  estado: string;
  resultado_resumen: string | null;
  created_at: string;
  reverted_at: string | null;
  reverted_by: string | null;
  estaciones?: { nombre: string } | null;
};

type ImportError = {
  id: string;
  fila: number | null;
  campo: string | null;
  valor: string | null;
  tipo: string;
  mensaje: string;
  solucion_sugerida: string | null;
};

const ESTADO_STYLES: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  completado: { label: 'Completado', cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  revertido: { label: 'Revertido', cls: 'bg-slate-100 text-slate-500', icon: XCircle },
  error: { label: 'Error', cls: 'bg-red-50 text-red-700', icon: AlertTriangle },
  en_progreso: { label: 'En progreso', cls: 'bg-amber-50 text-amber-700', icon: Loader2 },
};

export function ImportHistory() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [reverting, setReverting] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch | null>(null);
  const [batchErrors, setBatchErrors] = useState<ImportError[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [confirmRevert, setConfirmRevert] = useState<ImportBatch | null>(null);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('est_import_batches')
      .select('*, estaciones(nombre)')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Error al cargar el historial.');
    } else {
      setBatches((data as ImportBatch[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchBatches(); }, [user, fetchBatches]);

  const handleViewErrors = async (batch: ImportBatch) => {
    setSelectedBatch(batch);
    const { data } = await supabase.from('est_import_errores').select('*').eq('batch_id', batch.id).order('fila').limit(100);
    setBatchErrors((data as ImportError[]) ?? []);
    setShowErrors(true);
  };

  const handleRevert = async (batch: ImportBatch) => {
    setReverting(batch.id);
    try {
      // Delete all lecturas from this batch
      const { error: delLecturasErr } = await supabase
        .from('est_lecturas')
        .delete()
        .eq('import_batch_id', batch.id);

      if (delLecturasErr) console.error('[Revert] lecturas error:', delLecturasErr);

      // Delete vales from this batch
      const { error: delValesErr } = await supabase
        .from('est_vales')
        .delete()
        .eq('import_batch_id', batch.id);

      if (delValesErr) console.error('[Revert] vales error:', delValesErr);

      // Delete carrotanques from this batch
      const { error: delCarrotanquesErr } = await supabase
        .from('est_carrotanques')
        .delete()
        .eq('import_batch_id', batch.id);

      if (delCarrotanquesErr) console.error('[Revert] carrotanques error:', delCarrotanquesErr);

      // Delete import errors from this batch
      await supabase.from('est_import_errores').delete().eq('batch_id', batch.id);

      // Update batch status
      const { error: updErr } = await supabase
        .from('est_import_batches')
        .update({
          estado: 'revertido',
          reverted_at: new Date().toISOString(),
          reverted_by: user?.email ?? 'sistema',
        })
        .eq('id', batch.id);

      if (updErr) throw updErr;

      toast.success(`Importación revertida. ${batch.registros_importados} registros eliminados.`);
      fetchBatches();
    } catch (err) {
      console.error('[Revert] Error:', err);
      toast.error('Error al revertir la importación.');
    } finally {
      setReverting(null);
      setConfirmRevert(null);
    }
  };

  if (loading) {
    return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  }

  if (batches.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100"><History className="h-7 w-7 text-slate-400" /></div>
        <h3 className="mt-4 text-sm font-semibold text-slate-700">No hay importaciones registradas</h3>
        <p className="mt-1 text-xs text-slate-500">Las importaciones que realices aparecerán aquí.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-slate-400" />
        <h2 className="text-lg font-bold text-slate-900">Historial de importaciones</h2>
        <span className="text-xs text-slate-400">({batches.length})</span>
      </div>

      <div className="space-y-3">
        {batches.map((batch) => {
          const estado = ESTADO_STYLES[batch.estado] ?? ESTADO_STYLES.completado;
          const EstadoIcon = estado.icon;
          return (
            <Card key={batch.id} className={cn('p-5 transition-shadow hover:shadow-soft-lg', batch.estado === 'revertido' && 'opacity-60')}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900 truncate">{batch.nombre_archivo}</p>
                    <Badge className={cn('text-[10px]', estado.cls)}>
                      <EstadoIcon className={cn('h-3 w-3 mr-0.5', batch.estado === 'en_progreso' && 'animate-spin')} />
                      {estado.label}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{batch.user_email}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(batch.created_at).toLocaleString('es-CO')}</span>
                    {batch.estaciones?.nombre && <span className="flex items-center gap-1"><Database className="h-3 w-3" />{batch.estaciones.nombre}</span>}
                    <span className="capitalize">{batch.tipo_importacion}</span>
                    {batch.hoja_seleccionada && <span>Hoja: {batch.hoja_seleccionada}</span>}
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs">
                    <span className="text-slate-500">Total: <strong className="text-slate-700">{batch.total_filas}</strong></span>
                    <span className="text-emerald-600">Importados: <strong>{batch.registros_importados}</strong></span>
                    {batch.registros_omitidos > 0 && <span className="text-slate-500">Omitidos: <strong>{batch.registros_omitidos}</strong></span>}
                    {batch.registros_error > 0 && <span className="text-red-600">Errores: <strong>{batch.registros_error}</strong></span>}
                    {batch.registros_advertencia > 0 && <span className="text-amber-600">Advertencias: <strong>{batch.registros_advertencia}</strong></span>}
                    {batch.duplicados > 0 && <span className="text-amber-600">Duplicados: <strong>{batch.duplicados}</strong></span>}
                    {batch.periodo_inicio && <span className="text-slate-500">Periodo: {batch.periodo_inicio} → {batch.periodo_fin}</span>}
                  </div>

                  {batch.estado === 'revertido' && batch.reverted_at && (
                    <p className="mt-2 text-xs text-slate-400">Revertido por {batch.reverted_by} el {new Date(batch.reverted_at).toLocaleString('es-CO')}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  {batch.registros_error > 0 && batch.estado !== 'revertido' && (
                    <Button size="sm" variant="outline" onClick={() => handleViewErrors(batch)} className="text-xs gap-1.5">
                      <AlertTriangle className="h-3 w-3" />Ver errores
                    </Button>
                  )}
                  {batch.estado === 'completado' && batch.registros_importados > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmRevert(batch)}
                      disabled={reverting === batch.id}
                      className="text-xs gap-1.5 text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      {reverting === batch.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                      Revertir
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Error dialog */}
      <Dialog open={showErrors} onOpenChange={setShowErrors}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Errores de importación</DialogTitle>
            <DialogDescription>{selectedBatch?.nombre_archivo}</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200">
            {batchErrors.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">No hay errores registrados.</p>
            ) : (
              batchErrors.map((err, i) => (
                <div key={err.id} className={cn('flex items-start gap-3 border-b border-slate-100 p-3 text-xs last:border-0',
                  err.tipo === 'error' ? 'bg-red-50/50' : err.tipo === 'advertencia' ? 'bg-amber-50/50' : 'bg-blue-50/50')}>
                  <span className="font-bold text-slate-400 w-12 shrink-0">F{err.fila ?? '—'}</span>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-700">{err.campo}: </span>
                    <span className="text-slate-600">{err.mensaje}</span>
                    {err.solucion_sugerida && <p className="mt-0.5 text-slate-400">→ {err.solucion_sugerida}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Revert confirmation */}
      <Dialog open={!!confirmRevert} onOpenChange={(open) => !open && setConfirmRevert(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revertir importación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de revertir la importación de <strong>{confirmRevert?.nombre_archivo}</strong>?
              Se eliminarán <strong>{confirmRevert?.registros_importados} registros</strong> importados en este lote.
              Los datos nativos creados fuera de esta importación no se verán afectados.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRevert(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => confirmRevert && handleRevert(confirmRevert)} disabled={reverting === confirmRevert?.id}>
              {reverting === confirmRevert?.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RotateCcw className="h-4 w-4 mr-1" />}
              Revertir importación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
