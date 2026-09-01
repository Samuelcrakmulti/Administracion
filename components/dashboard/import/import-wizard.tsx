'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  Upload, FileSpreadsheet, Check, AlertTriangle, X, Loader2,
  ArrowRight, ArrowLeft, Database, MapPin, Eye, ShieldCheck,
  Download, RotateCcw, History, Info, FileDown,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  parseExcelFile, autoDetectMapping, parseSheetRows, normalizeProductName,
  detectDuplicates, exportIssuesCSV,
  type ParsedExcel, type SheetInfo, type ColumnMapping, type ParsedRow, type ValidationIssue,
} from '@/lib/excel-parser';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type TipoImportacion = 'galonaje' | 'iniciales' | 'otros';
type DuplicateMode = 'omit' | 'new_only' | 'force';

type ImportResult = {
  batchId: string;
  imported: number;
  omitted: number;
  errors: number;
  warnings: number;
  duplicates: number;
  galonesProcesados: number;
  valesImportados: number;
  carrotanquesImportados: number;
  productosDetectados: string[];
  turnosDetectados: string[];
  diferenciasDetectadas: number;
  conciliados: number;
};

const STEP_LABELS = ['Archivo', 'Estructura', 'Mapeo', 'Validación', 'Vista previa', 'Confirmación', 'Importar', 'Resultado'];

type Estacion = { id: string; nombre: string };
type Producto = { id: string; nombre: string };
type Manguera = { id: string; numero: number; producto_id: string | null };

export function ImportWizard({ estaciones, productos, mangueras }: {
  estaciones: Estacion[];
  productos: Producto[];
  mangueras: Manguera[];
}) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [tipoImportacion, setTipoImportacion] = useState<TipoImportacion>('galonaje');
  const [estacionId, setEstacionId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedExcel | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [unusedColumns, setUnusedColumns] = useState<string[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [alreadyImported, setAlreadyImported] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>('omit');
  const [existingBatchInfo, setExistingBatchInfo] = useState<{ id: string; nombre_archivo: string; created_at: string } | null>(null);
  const [sheetData, setSheetData] = useState<Record<string, Record<string, unknown>[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSheet = parsed?.sheets.find((s) => s.name === selectedSheet);

  // Product mapping (Excel name -> NexoPyme product)
  const [productMappings, setProductMappings] = useState<Record<string, string>>({});

  // Step 1: File upload
  const handleFileSelect = useCallback(async (f: File) => {
    setFile(f);
    setParsing(true);
    try {
      const result = await parseExcelFile(f);
      setParsed(result);

      // Auto-select INICIALES sheet if exists for iniciales import
      const inicialesSheet = result.sheets.find((s) => s.name.toLowerCase().includes('inicial'));
      const firstSheet = result.sheets[0]?.name ?? '';
      const autoSheet = inicialesSheet?.name ?? firstSheet;
      setSelectedSheet(autoSheet);

      // Load sheet data for all sheets
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const data: Record<string, Record<string, unknown>[]> = {};
      wb.SheetNames.forEach((name) => {
        const ws = wb.Sheets[name];
        data[name] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: null });
      });
      setSheetData(data);

      // Auto-detect mapping for the auto-selected sheet
      const sheet = result.sheets.find((s) => s.name === autoSheet);
      if (sheet) {
        const autoMap = autoDetectMapping(sheet.headers);
        setMapping(autoMap);
      }

      // Check for duplicate import
      const { data: existing } = await supabase
        .from('est_import_batches')
        .select('id, nombre_archivo, created_at')
        .eq('file_hash', result.fileHash)
        .order('created_at', { ascending: false })
        .limit(1);
      const existingBatch = (existing?.[0] as { id: string; nombre_archivo: string; created_at: string } | undefined) ?? null;
      setAlreadyImported((existing?.length ?? 0) > 0);
      setExistingBatchInfo(existingBatch);

      setStep(2);
    } catch (err) {
      console.error('[Import] Parse error:', err);
      toast.error('No se pudo leer el archivo. Verifica que sea un Excel válido.');
    } finally {
      setParsing(false);
    }
  }, []);

  // Step 2: Select sheet -> go to mapping
  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheet(sheetName);
    const sheet = parsed?.sheets.find((s) => s.name === sheetName);
    if (sheet) {
      const autoMap = autoDetectMapping(sheet.headers);
      setMapping(autoMap);
    }
  };

  // Step 3: Apply mapping and validate
  const handleApplyMapping = useCallback(() => {
    if (!mapping || !selectedSheet) return;
    const data = sheetData[selectedSheet] ?? [];
    setAllRows(data);

    const { rows, issues: rowIssues, unusedColumns: unused } = parseSheetRows(data, mapping, tipoImportacion);
    const dups = detectDuplicates(rows);
    setParsedRows(rows);
    setIssues(rowIssues);
    setUnusedColumns(unused);
    setDuplicateCount(dups);

    // Auto-map products
    const excelProducts = [...new Set(rows.map((r) => r.producto).filter(Boolean))] as string[];
    const newMappings: Record<string, string> = {};
    excelProducts.forEach((ep) => {
      const normalized = normalizeProductName(ep);
      const match = productos.find((p) => p.nombre.toLowerCase() === normalized.toLowerCase());
      if (match) newMappings[ep] = match.id;
    });
    setProductMappings(newMappings);

    setStep(4);
  }, [mapping, selectedSheet, sheetData, tipoImportacion, productos]);

  // Step 6 -> 7: Perform import
  const handleImport = useCallback(async () => {
    if (!estacionId || !file || !parsed) return;
    setImporting(true);
    setImportProgress(0);

    try {
      // Create batch record
      const validRows = parsedRows.filter((r) => r.estado !== 'error' && r.fecha);
      const errorRows = parsedRows.filter((r) => r.estado === 'error');
      const warningRows = parsedRows.filter((r) => r.estado === 'advertencia');
      const dates = validRows.map((r) => r.fecha!).sort();
      const periodoInicio = dates[0] ?? null;
      const periodoFin = dates[dates.length - 1] ?? null;

      const { data: batchData, error: batchErr } = await supabase.from('est_import_batches').insert({
        user_email: user?.email ?? 'sistema',
        estacion_id: estacionId,
        tipo_importacion: tipoImportacion,
        nombre_archivo: file.name,
        tamano_archivo: file.size,
        file_hash: parsed.fileHash,
        hoja_seleccionada: selectedSheet,
        total_filas: parsedRows.length,
        registros_validos: validRows.length,
        registros_importados: 0,
        registros_omitidos: errorRows.length,
        registros_error: errorRows.length,
        registros_advertencia: warningRows.length,
        duplicados: duplicateCount,
        periodo_inicio: periodoInicio,
        periodo_fin: periodoFin,
        estado: 'en_progreso',
      }).select('id').single();

      if (batchErr || !batchData) {
        throw new Error('No se pudo crear el registro de importación.');
      }
      const batchId = batchData.id;

      // Insert error logs
      if (issues.length > 0) {
        const errorRecords = issues.slice(0, 500).map((i) => ({
          batch_id: batchId,
          fila: i.fila,
          campo: i.campo,
          valor: i.valor,
          tipo: i.tipo,
          mensaje: i.mensaje,
          solucion_sugerida: i.solucion,
        }));
        await supabase.from('est_import_errores').insert(errorRecords);
      }

      // Split rows by type: vales, carrotanques, and regular lecturas
      const valesRows = validRows.filter((r) => r.esVale);
      const carrotanquesRows = validRows.filter((r) => r.esCarrotanque);
      const lecturasRows = validRows.filter((r) => !r.esVale && !r.esCarrotanque);

      // For duplicate mode 'omit', filter out rows that already exist in DB
      let rowsToImport = lecturasRows;
      if (duplicateMode === 'omit' && alreadyImported) {
        // Skip all — already imported
        rowsToImport = [];
      }

      let imported = 0;
      let valesImported = 0;
      let carrotanquesImported = 0;
      let galonesProcesados = 0;
      const batchSize = 100;

      // Import regular lecturas
      for (let i = 0; i < rowsToImport.length; i += batchSize) {
        const chunk = rowsToImport.slice(i, i + batchSize);
        const lecturas = chunk.map((r) => {
          const productId = r.producto ? productMappings[r.producto] ?? null : null;
          return {
            estacion_id: estacionId,
            fecha: r.fecha,
            turno: r.turno ?? null,
            producto_id: productId ?? null,
            nombre_producto: r.producto,
            numero_manguera: r.manguera ? parseInt(r.manguera, 10) || null : null,
            lectura_inicial: r.inicial,
            lectura_final: r.final,
            galones_vendidos: r.galones ?? 0,
            precio_unitario: r.precio ?? null,
            empleado: r.empleado ?? 'No identificado',
            source: 'imported',
            import_batch_id: batchId,
          };
        });

        const { error: insertErr } = await supabase.from('est_lecturas').insert(lecturas);
        if (insertErr) {
          console.error('[Import] Insert error:', insertErr);
        } else {
          imported += lecturas.length;
          galonesProcesados += chunk.reduce((sum, r) => sum + (r.galones ?? 0), 0);
        }
        setImportProgress(Math.min(Math.round(((i + batchSize) / rowsToImport.length) * 50), 50));
      }

      // Import vales to est_vales
      if (valesRows.length > 0) {
        for (let i = 0; i < valesRows.length; i += batchSize) {
          const chunk = valesRows.slice(i, i + batchSize);
          const vales = chunk.map((r) => ({
            estacion_id: estacionId,
            fecha: r.fecha,
            turno: r.turno ?? null,
            nombre: r.producto ?? 'Vale',
            cantidad: r.galones ?? 0,
            valor: r.precio ? (r.galones ?? 0) * r.precio : 0,
            observacion: r.empleado ? `Empleado: ${r.empleado}` : null,
            import_batch_id: batchId,
            source: 'imported',
          }));
          const { error: insertErr } = await supabase.from('est_vales').insert(vales);
          if (insertErr) {
            console.error('[Import] Vales insert error:', insertErr);
          } else {
            valesImported += vales.length;
          }
        }
      }

      // Import carrotanques to est_carrotanques
      if (carrotanquesRows.length > 0) {
        for (let i = 0; i < carrotanquesRows.length; i += batchSize) {
          const chunk = carrotanquesRows.slice(i, i + batchSize);
          const carrotanques = chunk.map((r) => ({
            estacion_id: estacionId,
            fecha: r.fecha,
            tipo_combustible: r.producto ?? null,
            cantidad_galones: r.galones ?? 0,
            proveedor: r.empleado ?? null,
            import_batch_id: batchId,
            source: 'imported',
          }));
          const { error: insertErr } = await supabase.from('est_carrotanques').insert(carrotanques);
          if (insertErr) {
            console.error('[Import] Carrotanques insert error:', insertErr);
          } else {
            carrotanquesImported += carrotanques.length;
          }
        }
      }

      setImportProgress(75);

      // Post-import validation: detect products, turnos, and calculate conciliación
      const productosDetectados = [...new Set(validRows.map((r) => r.producto).filter(Boolean))] as string[];
      const turnosDetectados = [...new Set(validRows.map((r) => r.turno).filter(Boolean))] as string[];

      // Conciliación: compare galonaje vs inicial/final for rows that have both
      const rowsWithBoth = validRows.filter((r) => r.inicial !== null && r.final !== null && r.galones !== null);
      const diferenciasDetectadas = rowsWithBoth.filter((r) => {
        const calculated = (r.final! - r.inicial!);
        return Math.abs(calculated - r.galones!) > 0.01;
      }).length;
      const conciliados = rowsWithBoth.length - diferenciasDetectadas;

      setImportProgress(90);

      const totalImported = imported + valesImported + carrotanquesImported;
      const estadoFinal = warningRows.length > 0 ? 'completado_con_advertencias' : 'completado';

      // Update batch status
      await supabase.from('est_import_batches').update({
        registros_importados: totalImported,
        estado: estadoFinal,
        resultado_resumen: `Importación completada: ${totalImported} registros (${imported} lecturas, ${valesImported} vales, ${carrotanquesImported} carrotanques), ${errorRows.length} omitidos, ${warningRows.length} advertencias, ${diferenciasDetectadas} diferencias detectadas.`,
      }).eq('id', batchId);

      setImportProgress(100);
      setImportResult({
        batchId,
        imported: totalImported,
        omitted: errorRows.length,
        errors: errorRows.length,
        warnings: warningRows.length,
        duplicates: duplicateCount,
        galonesProcesados,
        valesImportados,
        carrotanquesImportados,
        productosDetectados,
        turnosDetectados,
        diferenciasDetectadas,
        conciliados,
      });
      setStep(8);
      toast.success(`Importación completada: ${totalImported} registros importados.`);
    } catch (err) {
      console.error('[Import] Error:', err);
      toast.error('Error durante la importación. Revisa el log para más detalles.');
    } finally {
      setImporting(false);
    }
  }, [estacionId, file, parsed, parsedRows, issues, duplicateCount, productMappings, selectedSheet, tipoImportacion, user, sheetData]);

  const handleDownloadErrors = () => {
    if (issues.length === 0) return;
    const csv = exportIssuesCSV(issues);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errores_importacion_${file?.name ?? ''}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setParsed(null);
    setSelectedSheet('');
    setMapping(null);
    setParsedRows([]);
    setIssues([]);
    setUnusedColumns([]);
    setDuplicateCount(0);
    setImportResult(null);
    setProductMappings({});
    setAlreadyImported(false);
    setDuplicateMode('omit');
    setExistingBatchInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Stats
  const stats = useMemo(() => {
    const valid = parsedRows.filter((r) => r.estado === 'valido').length;
    const warnings = parsedRows.filter((r) => r.estado === 'advertencia').length;
    const errors = parsedRows.filter((r) => r.estado === 'error').length;
    const newRecords = valid + warnings - duplicateCount;
    return { valid, warnings, errors, total: parsedRows.length, newRecords };
  }, [parsedRows, duplicateCount]);

  const canImport = stats.errors === 0 && estacionId && parsedRows.length > 0 && (!alreadyImported || duplicateMode !== 'omit');

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center justify-between">
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isDone = step < stepNum;
          const isCurrent = step === stepNum;
          return (
            <div key={label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all',
                  isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-amber-600 text-white ring-4 ring-amber-100' : 'bg-slate-100 text-slate-400'
                )}>
                  {isDone ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                <span className={cn('text-[10px] font-medium hidden sm:block', isCurrent ? 'text-amber-700' : 'text-slate-400')}>{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className={cn('h-0.5 flex-1 mx-1', isDone ? 'bg-emerald-400' : 'bg-slate-100')} />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card className="p-6 min-h-[400px]">
        {/* STEP 1: File upload */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Importar datos históricos</h2>
              <p className="text-sm text-slate-500 mt-1">Selecciona el tipo de archivo y la estación destino.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Tipo de importación</Label>
                <Select value={tipoImportacion} onValueChange={(v) => setTipoImportacion(v as TipoImportacion)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="galonaje">Galonaje</SelectItem>
                    <SelectItem value="iniciales">Iniciales / Finales</SelectItem>
                    <SelectItem value="otros">Otros históricos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Estación destino *</Label>
                <Select value={estacionId} onValueChange={setEstacionId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar estación…" /></SelectTrigger>
                  <SelectContent>
                    {estaciones.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              className={cn(
                'rounded-2xl border-2 border-dashed p-10 text-center transition-all',
                file ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
              )}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
            >
              {parsing ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
                  <p className="mt-3 text-sm text-slate-600">Analizando archivo…</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
                    <FileSpreadsheet className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>Cambiar archivo</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
                    <Upload className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Arrastra tu archivo aquí</p>
                  <p className="text-xs text-slate-400">o haz clic para seleccionar</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>Seleccionar archivo</Button>
                  <p className="mt-3 text-[10px] text-slate-400">Formatos soportados: .xlsx, .xls, .csv</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />
            </div>

            {alreadyImported && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Este archivo ya fue importado anteriormente</p>
                    {existingBatchInfo && (
                      <p className="text-xs text-amber-600">
                        Importado el {new Date(existingBatchInfo.created_at).toLocaleString('es-CO')} — {existingBatchInfo.nombre_archivo}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-700">¿Qué deseas hacer?</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      onClick={() => setDuplicateMode('omit')}
                      className={cn(
                        'rounded-lg border-2 p-3 text-left text-xs transition-all',
                        duplicateMode === 'omit' ? 'border-amber-400 bg-amber-100' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <p className="font-semibold text-slate-800">Omitir existentes</p>
                      <p className="text-slate-500 mt-0.5">No importar nada de este archivo</p>
                    </button>
                    <button
                      onClick={() => setDuplicateMode('new_only')}
                      className={cn(
                        'rounded-lg border-2 p-3 text-left text-xs transition-all',
                        duplicateMode === 'new_only' ? 'border-amber-400 bg-amber-100' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <p className="font-semibold text-slate-800">Solo nuevos</p>
                      <p className="text-slate-500 mt-0.5">Importar únicamente registros no duplicados</p>
                    </button>
                    <button
                      onClick={() => setDuplicateMode('force')}
                      className={cn(
                        'rounded-lg border-2 p-3 text-left text-xs transition-all',
                        duplicateMode === 'force' ? 'border-red-400 bg-red-50' : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <p className="font-semibold text-slate-800">Forzar importación</p>
                      <p className="text-slate-500 mt-0.5">Importar todo de nuevo (requiere autorización)</p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Sheet selection */}
        {step === 2 && parsed && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Estructura detectada</h2>
              <p className="text-sm text-slate-500 mt-1">Selecciona la hoja que contiene los datos a importar.</p>
            </div>

            <div className="space-y-2">
              {parsed.sheets.map((sheet) => (
                <button
                  key={sheet.name}
                  onClick={() => handleSheetSelect(sheet.name)}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all',
                    selectedSheet === sheet.name ? 'border-amber-400 bg-amber-50' : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', selectedSheet === sheet.name ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400')}>
                    <Database className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{sheet.name}</p>
                    <p className="text-xs text-slate-400">{sheet.rowCount} filas · {sheet.colCount} columnas</p>
                  </div>
                  {sheet.name.toLowerCase().includes('inicial') && (
                    <Badge className="bg-blue-50 text-blue-700">INICIALES</Badge>
                  )}
                  {selectedSheet === sheet.name && <Check className="h-5 w-5 text-amber-600" />}
                </button>
              ))}
            </div>

            {/* Preview of selected sheet */}
            {currentSheet && currentSheet.previewRows.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Vista previa (primeras 5 filas):</p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {currentSheet.headers.slice(0, 8).map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {currentSheet.previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          {currentSheet.headers.slice(0, 8).map((h) => <td key={h} className="px-3 py-2 text-slate-700">{String(row[h] ?? '')}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" />Atrás</Button>
              <Button onClick={() => setStep(3)} disabled={!selectedSheet}>Continuar<ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* STEP 3: Column mapping */}
        {step === 3 && mapping && currentSheet && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Mapeo de columnas</h2>
              <p className="text-sm text-slate-500 mt-1">Verifica que cada columna esté correctamente asignada.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { key: 'fecha', label: 'Fecha' },
                { key: 'turno', label: 'Turno' },
                { key: 'producto', label: 'Producto' },
                { key: 'manguera', label: 'Manguera' },
                { key: 'estacion', label: 'Estación' },
                { key: 'empleado', label: 'Empleado' },
                { key: 'inicial', label: 'Lectura Inicial' },
                { key: 'final', label: 'Lectura Final' },
                { key: 'galones', label: 'Galones' },
                { key: 'acumulado', label: 'Acumulado mensual' },
                { key: 'diferencia', label: 'Diferencia' },
                { key: 'precio', label: 'Precio' },
              ] as const).map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">{field.label}</Label>
                  <Select
                    value={mapping[field.key] ?? '__none__'}
                    onValueChange={(v) => setMapping((m) => ({ ...m!, [field.key]: v === '__none__' ? null : v }))}
                  >
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No mapear —</SelectItem>
                      {currentSheet.headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Product mapping */}
            {parsedRows.length === 0 && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <p className="text-xs text-blue-700">Los productos y mangueras se mapearán automáticamente. Podrás revisarlos en el siguiente paso.</p>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" />Atrás</Button>
              <Button onClick={handleApplyMapping}>Aplicar mapeo<ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* STEP 4: Validation */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Validación de datos</h2>
              <p className="text-sm text-slate-500 mt-1">Revisa los resultados de la validación antes de continuar.</p>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">Filas detectadas</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{stats.valid}</p>
                <p className="text-xs text-emerald-600">Registros válidos</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-700">{stats.warnings}</p>
                <p className="text-xs text-amber-600">Advertencias</p>
              </div>
              <div className="rounded-xl bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{stats.errors}</p>
                <p className="text-xs text-red-600">Errores</p>
              </div>
            </div>

            {duplicateCount > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{duplicateCount} posible(s) duplicado(s) detectado(s)</p>
                  <p className="text-xs text-amber-600">Los registros duplicados se omitirán durante la importación.</p>
                </div>
              </div>
            )}

            {/* Unused columns */}
            {unusedColumns.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Columnas no utilizadas ({unusedColumns.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {unusedColumns.map((c) => <Badge key={c} variant="outline" className="text-xs text-slate-400">{c}</Badge>)}
                </div>
              </div>
            )}

            {/* Issues list */}
            {issues.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500">Problemas detectados:</p>
                  <Button size="sm" variant="outline" onClick={handleDownloadErrors} className="text-xs gap-1.5">
                    <FileDown className="h-3 w-3" />Descargar errores
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200">
                  {issues.slice(0, 50).map((issue, i) => (
                    <div key={i} className={cn('flex items-start gap-3 border-b border-slate-100 p-2.5 text-xs last:border-0',
                      issue.tipo === 'error' ? 'bg-red-50/50' : issue.tipo === 'advertencia' ? 'bg-amber-50/50' : 'bg-blue-50/50')}>
                      <span className="font-bold text-slate-400 w-12">F{issue.fila}</span>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-700">{issue.campo}: </span>
                        <span className="text-slate-600">{issue.mensaje}</span>
                        {issue.solucion && <span className="text-slate-400"> — {issue.solucion}</span>}
                      </div>
                    </div>
                  ))}
                  {issues.length > 50 && <p className="p-2 text-center text-xs text-slate-400">+{issues.length - 50} más…</p>}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="h-4 w-4 mr-1" />Atrás</Button>
              <Button onClick={() => setStep(5)} disabled={stats.errors > 0 && stats.valid === 0}>Continuar<ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* STEP 5: Preview */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Vista previa</h2>
              <p className="text-sm text-slate-500 mt-1">Revisa los datos antes de importar.</p>
            </div>

            {/* Product mappings */}
            {Object.keys(productMappings).length > 0 && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 mb-3">Mapeo de productos:</p>
                <div className="space-y-2">
                  {Object.entries(productMappings).map(([excel, productId]) => {
                    const prod = productos.find((p) => p.id === productId);
                    return (
                      <div key={excel} className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">{excel}</span>
                        <ArrowRight className="h-3 w-3 text-slate-300" />
                        <Select
                          value={productId}
                          onValueChange={(v) => setProductMappings((p) => ({ ...p, [excel]: v }))}
                        >
                          <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data preview table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-slate-600">#</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-600">Fecha</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-600">Turno</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-600">Manguera</th>
                    <th className="px-2 py-2 text-left font-semibold text-slate-600">Producto</th>
                    {tipoImportacion === 'iniciales' && <><th className="px-2 py-2 text-right font-semibold text-slate-600">Inicial</th><th className="px-2 py-2 text-right font-semibold text-slate-600">Final</th></>}
                    <th className="px-2 py-2 text-right font-semibold text-slate-600">Galones</th>
                    <th className="px-2 py-2 text-center font-semibold text-slate-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 100).map((row) => (
                    <tr key={row.fila} className={cn('border-t border-slate-100',
                      row.estado === 'error' ? 'bg-red-50/50' : row.estado === 'advertencia' ? 'bg-amber-50/50' : '')}>
                      <td className="px-2 py-1.5 text-slate-400">{row.fila}</td>
                      <td className="px-2 py-1.5 text-slate-700">{row.fecha ?? '—'}</td>
                      <td className="px-2 py-1.5 text-slate-700">{row.turno ?? '—'}</td>
                      <td className="px-2 py-1.5 text-slate-700">{row.manguera ?? '—'}</td>
                      <td className="px-2 py-1.5 text-slate-700">{row.producto ?? '—'}</td>
                      {tipoImportacion === 'iniciales' && <><td className="px-2 py-1.5 text-right text-slate-700">{row.inicial?.toLocaleString('es-CO') ?? '—'}</td><td className="px-2 py-1.5 text-right text-slate-700">{row.final?.toLocaleString('es-CO') ?? '—'}</td></>}
                      <td className="px-2 py-1.5 text-right font-semibold text-slate-900">{row.galones !== null ? row.galones.toLocaleString('es-CO', { maximumFractionDigits: 3 }) : '—'}</td>
                      <td className="px-2 py-1.5 text-center">
                        {row.estado === 'valido' && <span className="text-emerald-600">🟢</span>}
                        {row.estado === 'advertencia' && <span className="text-amber-600">🟠</span>}
                        {row.estado === 'error' && <span className="text-red-600">🔴</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 100 && <p className="text-center text-xs text-slate-400">Mostrando 100 de {parsedRows.length} registros.</p>}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(4)}><ArrowLeft className="h-4 w-4 mr-1" />Atrás</Button>
              <Button onClick={() => setStep(6)}>Continuar<ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* STEP 6: Confirmation */}
        {step === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Confirmación</h2>
              <p className="text-sm text-slate-500 mt-1">Verifica los detalles antes de importar.</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                <div><p className="text-sm font-semibold text-slate-900">{file?.name}</p><p className="text-xs text-slate-400">{parsed?.sheets.find(s => s.name === selectedSheet)?.rowCount} filas en hoja "{selectedSheet}"</p></div>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Estación destino:</span><span className="font-semibold text-slate-900">{estaciones.find(e => e.id === estacionId)?.nombre ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Archivo:</span><span className="font-semibold text-slate-900">{file?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Periodo:</span><span className="font-semibold text-slate-900">
                  {(() => {
                    const validRows = parsedRows.filter((r) => r.fecha);
                    const dates = validRows.map((r) => r.fecha!).sort();
                    if (dates.length === 0) return '—';
                    return `${dates[0]} → ${dates[dates.length - 1]}`;
                  })()}
                </span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tipo:</span><span className="font-semibold text-slate-900 capitalize">{tipoImportacion}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cantidad de registros:</span><span className="font-semibold text-slate-900">{stats.total}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Registros válidos:</span><span className="font-semibold text-emerald-600">{stats.valid}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Advertencias:</span><span className="font-semibold text-amber-600">{stats.warnings}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Errores:</span><span className="font-semibold text-red-600">{stats.errors}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Duplicados:</span><span className="font-semibold text-amber-600">{duplicateCount}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Registros nuevos:</span><span className="font-semibold text-emerald-600">{stats.valid + stats.warnings - duplicateCount}</span></div>
              </div>

              {alreadyImported && duplicateMode === 'omit' && (
                <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-3">
                  <X className="h-4 w-4 text-red-500" />
                  <p className="text-xs text-red-700">La importación está bloqueada porque el archivo ya fue importado y se seleccionó "Omitir existentes".</p>
                </div>
              )}
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-200 p-4">
              <ShieldCheck className="h-5 w-5 text-blue-500 mt-0.5" />
              <p className="text-xs text-blue-700">Los datos importados se marcarán como "imported" y se asociarán a un lote. Podrás revertir la importación desde el historial sin afectar los datos nativos.</p>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
              <ShieldCheck className="h-5 w-5 text-amber-500 mt-0.5" />
              <p className="text-xs text-amber-800"><strong>¿Confirmas que deseas importar estos datos?</strong> Los datos importados se marcarán como "imported" y se asociarán a un lote. Podrás revertir la importación desde el historial sin afectar los datos nativos.</p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(5)}><ArrowLeft className="h-4 w-4 mr-1" />Atrás</Button>
              <Button onClick={() => setStep(7)} disabled={!canImport} className="bg-amber-600 hover:bg-amber-700">Importar datos<ArrowRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* STEP 7: Importing */}
        {step === 7 && (
          <div className="flex flex-col items-center justify-center py-16">
            {importing ? (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
                <p className="mt-4 text-sm font-semibold text-slate-700">Importando datos…</p>
                <div className="mt-4 w-64">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${importProgress}%` }} />
                  </div>
                  <p className="mt-2 text-center text-xs text-slate-400">{importProgress}%</p>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
                  <Check className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">Listo para importar</p>
                <Button onClick={handleImport} className="mt-4 bg-amber-600 hover:bg-amber-700">Iniciar importación</Button>
              </>
            )}
          </div>
        )}

        {/* STEP 8: Result */}
        {step === 8 && importResult && (
          <div className="space-y-6">
            <div className="flex flex-col items-center py-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-slate-900">Importación completada</h2>
              <p className="text-sm text-slate-500">{file?.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-4 text-center"><p className="text-2xl font-bold text-emerald-700">{importResult.imported}</p><p className="text-xs text-emerald-600">Importados</p></div>
              <div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-2xl font-bold text-slate-700">{importResult.omitted}</p><p className="text-xs text-slate-500">Omitidos</p></div>
              <div className="rounded-xl bg-red-50 p-4 text-center"><p className="text-2xl font-bold text-red-700">{importResult.errors}</p><p className="text-xs text-red-600">Errores</p></div>
              <div className="rounded-xl bg-amber-50 p-4 text-center"><p className="text-2xl font-bold text-amber-700">{importResult.warnings}</p><p className="text-xs text-amber-600">Advertencias</p></div>
            </div>

            {/* Detailed summary (section 34) */}
            <div className="rounded-xl border border-slate-200 p-5 space-y-3">
              <p className="text-sm font-bold text-slate-900">Resumen detallado</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Registros procesados:</span><span className="font-semibold text-slate-900">{importResult.imported + importResult.omitted}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Importados:</span><span className="font-semibold text-emerald-600">{importResult.imported}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Omitidos:</span><span className="font-semibold text-slate-600">{importResult.omitted}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Errores:</span><span className="font-semibold text-red-600">{importResult.errors}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Advertencias:</span><span className="font-semibold text-amber-600">{importResult.warnings}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Duplicados:</span><span className="font-semibold text-amber-600">{importResult.duplicates}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Galones procesados:</span><span className="font-semibold text-slate-900">{importResult.galonesProcesados.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Diferencias detectadas:</span><span className="font-semibold text-amber-600">{importResult.diferenciasDetectadas}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Registros conciliados:</span><span className="font-semibold text-emerald-600">
                  {importResult.conciliados + importResult.diferenciasDetectadas > 0
                    ? Math.round((importResult.conciliados / (importResult.conciliados + importResult.diferenciasDetectadas)) * 100)
                    : 0}%
                </span></div>
                <div className="flex justify-between"><span className="text-slate-500">Vales importados:</span><span className="font-semibold text-blue-600">{importResult.valesImportados}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Carrotanques importados:</span><span className="font-semibold text-cyan-600">{importResult.carrotanquesImportados}</span></div>
              </div>

              {importResult.productosDetectados.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Productos detectados:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {importResult.productosDetectados.map((p) => <Badge key={p} variant="outline" className="text-xs text-slate-600">{p}</Badge>)}
                  </div>
                </div>
              )}

              {importResult.turnosDetectados.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold text-slate-500 mb-1.5">Turnos detectados:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {importResult.turnosDetectados.map((t) => <Badge key={t} variant="outline" className="text-xs text-slate-600">{t}</Badge>)}
                  </div>
                </div>
              )}
            </div>

            {importResult.diferenciasDetectadas > 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{importResult.diferenciasDetectadas} diferencia(s) detectada(s) en conciliación</p>
                  <p className="text-xs text-amber-600 mt-0.5">Revisa el módulo de Conciliación para ver el detalle de las diferencias entre galonaje e iniciales/finales.</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" onClick={handleDownloadErrors} className="gap-1.5"><FileDown className="h-4 w-4" />Descargar errores</Button>
              <Button variant="outline" onClick={handleReset} className="gap-1.5"><Upload className="h-4 w-4" />Nueva importación</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
