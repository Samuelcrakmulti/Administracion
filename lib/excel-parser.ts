import * as XLSX from 'xlsx';

export type SheetInfo = {
  name: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  previewRows: Record<string, unknown>[];
};

export type ParsedExcel = {
  fileName: string;
  fileSize: number;
  sheets: SheetInfo[];
  fileHash: string;
};

export type ColumnMapping = {
  fecha: string | null;
  turno: string | null;
  producto: string | null;
  manguera: string | null;
  estacion: string | null;
  inicial: string | null;
  final: string | null;
  galones: string | null;
  acumulado: string | null;
  diferencia: string | null;
  empleado: string | null;
  precio: string | null;
};

export type ValidationIssue = {
  fila: number;
  campo: string;
  valor: string;
  tipo: 'error' | 'advertencia' | 'informacion';
  mensaje: string;
  solucion: string;
};

export type ParsedRow = {
  fila: number;
  fecha: string | null;
  turno: string | null;
  producto: string | null;
  manguera: string | null;
  estacion: string | null;
  inicial: number | null;
  final: number | null;
  galones: number | null;
  acumulado: number | null;
  diferencia: number | null;
  empleado: string | null;
  precio: number | null;
  esVale: boolean;
  esCarrotanque: boolean;
  estado: 'valido' | 'advertencia' | 'error';
  issues: ValidationIssue[];
};

// Normalize column name for matching
function normalize(s: string): string {
  return String(s).toLowerCase().trim().replace(/_/g, ' ').replace(/\s+/g, ' ');
}

// Simple hash for file content (not cryptographic, just for dedup detection)
export async function fileHash(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let hash = 0;
  for (let i = 0; i < bytes.length; i++) {
    hash = ((hash << 5) - hash) + bytes[i];
    hash = hash & 0xffffffff;
  }
  return `h${Math.abs(hash).toString(16)}_${bytes.length}`;
}

// Parse an Excel/CSV file and return sheet info
export async function parseExcelFile(file: File): Promise<ParsedExcel> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  const sheets: SheetInfo[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 'A', raw: false, defval: null });
    const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: null });

    // Detect headers from first non-empty row
    const headers = jsonRows.length > 0 ? Object.keys(jsonRows[0]).filter((k) => k !== '__rowNum__') : [];

    return {
      name,
      rowCount: jsonRows.length,
      colCount: headers.length,
      headers,
      previewRows: jsonRows.slice(0, 5),
    };
  });

  const hash = await fileHash(file);

  return {
    fileName: file.name,
    fileSize: file.size,
    sheets,
    fileHash: hash,
  };
}

// Auto-detect column mapping based on header names
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const normHeaders = headers.map((h) => ({ original: h, norm: normalize(h) }));

  const findCol = (patterns: string[]): string | null => {
    for (const p of patterns) {
      const found = normHeaders.find((h) => h.norm.includes(p));
      if (found) return found.original;
    }
    return null;
  };

  return {
    fecha: findCol(['fecha', 'dia', 'date', 'fec']),
    turno: findCol(['turno', 'shift']),
    producto: findCol(['producto', 'combustible', 'tipo', 'fuel', 'gas']),
    manguera: findCol(['manguera', 'mang', 'dispenser', 'surtidor', 'hose']),
    estacion: findCol(['estacion', 'eds', 'sede', 'planta', 'station']),
    inicial: findCol(['inicial', 'lectura inicial', 'ini', 'inicial lectura', 'lect.inicial']),
    final: findCol(['final', 'lectura final', 'fin', 'final lectura', 'lect.final', 'lectura f']),
    galones: findCol(['galon', 'galones', 'volumen', 'vol', 'gallons', 'cant', 'cantidad']),
    acumulado: findCol(['acumulado', 'acumul', 'total mes', 'total acum', 'mes acum']),
    diferencia: findCol(['diferencia', 'difer', 'diff', 'desface']),
    empleado: findCol(['empleado', 'despachador', 'operario', 'vendedor', 'encargado']),
    precio: findCol(['precio', 'valor unit', 'precio galon', 'precio unitario']),
  };
}

// Parse a date value that could be in various formats
function parseDate(val: unknown): string | null {
  if (val == null || val === '') return null;

  // Excel date serial number
  if (typeof val === 'number' && val > 1000 && val < 100000) {
    const date = XLSX.SSF.parse_date_code(val);
    if (date && date.y && date.m && date.d) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }

  // Date object
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  if (!str) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    let y = dmy[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }

  // YYYY-MM-DD
  const ymd = str.match(/^(\d{4})[/.\-](\d{1,2})[/.\-](\d{1,2})$/);
  if (ymd) {
    const y = ymd[1];
    const m = ymd[2].padStart(2, '0');
    const d = ymd[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

// Parse a numeric value, handling Colombian/European number formats
function parseNumber(val: unknown): number | null {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return val;

  const str = String(val).trim();
  if (!str) return null;

  // Remove spaces and currency symbols
  let clean = str.replace(/[$\s]/g, '').replace(/[^\d,.\-]/g, '');

  if (!clean || clean === '-' || clean === '.') return null;

  // Handle Colombian format: 1.234,56 (dot=thousands, comma=decimal)
  if (clean.includes(',') && clean.includes('.')) {
    // Both present: determine which is decimal separator
    const lastComma = clean.lastIndexOf(',');
    const lastDot = clean.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Comma is decimal: remove dots, replace comma with dot
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else {
      // Dot is decimal: remove commas
      clean = clean.replace(/,/g, '');
    }
  } else if (clean.includes(',') && !clean.includes('.')) {
    // Only comma — could be decimal (1,5) or thousands (1,234)
    // If exactly one comma with 1-2 digits after, treat as decimal
    const parts = clean.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      clean = parts[0] + '.' + parts[1];
    } else {
      clean = clean.replace(/,/g, '');
    }
  }

  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

// Known vale/adjustment concepts — these are NOT products
const VALE_CONCEPTS = [
  'r. bosque', 'desarrollo urbano', 'verde carro', 'calibracion', 'moto',
  'toyota don jairo', 'toyota sra johanna', 'terpel', 'vale', 'ajuste',
  'credito', 'abono', 'descuento',
];

// Known carrotanque/entry concepts
const CARROTANQUE_CONCEPTS = [
  'carrotanque', 'carro tanque', 'recibido', 'entrada', 'compra',
  'recepcion', 'despacho recibido', 'carga',
];

export function isValeConcept(producto: string): boolean {
  const n = producto.toLowerCase().trim();
  return VALE_CONCEPTS.some((v) => n.includes(v));
}

export function isCarrotanqueConcept(producto: string): boolean {
  const n = producto.toLowerCase().trim();
  return CARROTANQUE_CONCEPTS.some((c) => n.includes(c));
}

// Full row parser that takes the raw data directly
export function parseSheetRows(
  data: Record<string, unknown>[],
  mapping: ColumnMapping,
  tipoImportacion: 'galonaje' | 'iniciales'
): { rows: ParsedRow[]; issues: ValidationIssue[]; unusedColumns: string[] } {
  const rows: ParsedRow[] = [];
  const allIssues: ValidationIssue[] = [];

  const usedCols = new Set(Object.values(mapping).filter(Boolean));
  const allHeaders = data.length > 0 ? Object.keys(data[0]).filter((k) => k !== '__rowNum__') : [];
  const unusedColumns = allHeaders.filter((h) => !usedCols.has(h));

  data.forEach((rawRow, idx) => {
    const filaNum = idx + 2; // +2 because row 1 is headers, and idx is 0-based
    const issues: ValidationIssue[] = [];

    const getVal = (col: string | null): unknown => {
      if (!col) return null;
      return rawRow[col] ?? null;
    };

    const fecha = parseDate(getVal(mapping.fecha));
    const turno = getVal(mapping.turno) ? String(getVal(mapping.turno)).trim() : null;
    let producto = getVal(mapping.producto) ? String(getVal(mapping.producto)).trim() : null;
    // Detect vales and carrotanques — don't treat them as regular products
    let esVale = false;
    let esCarrotanque = false;
    if (producto) {
      if (isValeConcept(producto)) {
        esVale = true;
      } else if (isCarrotanqueConcept(producto)) {
        esCarrotanque = true;
      }
    }
    const manguera = getVal(mapping.manguera) ? String(getVal(mapping.manguera)).trim() : null;
    const estacion = getVal(mapping.estacion) ? String(getVal(mapping.estacion)).trim() : null;
    const empleado = getVal(mapping.empleado) ? String(getVal(mapping.empleado)).trim() : null;
    const inicial = parseNumber(getVal(mapping.inicial));
    const final = parseNumber(getVal(mapping.final));
    const galones = parseNumber(getVal(mapping.galones));
    const acumulado = parseNumber(getVal(mapping.acumulado));
    const diferencia = parseNumber(getVal(mapping.diferencia));
    const precio = parseNumber(getVal(mapping.precio));

    // Validation
    if (!fecha) {
      issues.push({ fila: filaNum, campo: mapping.fecha ?? 'fecha', valor: String(getVal(mapping.fecha) ?? ''), tipo: 'error', mensaje: 'Fecha vacía o formato no reconocido', solucion: 'Verificar el formato de fecha (DD/MM/YYYY)' });
    }

    if (tipoImportacion === 'iniciales') {
      if (inicial === null) {
        issues.push({ fila: filaNum, campo: mapping.inicial ?? 'inicial', valor: String(getVal(mapping.inicial) ?? ''), tipo: 'error', mensaje: 'Lectura inicial vacía', solucion: 'Ingresar el valor de lectura inicial' });
      }
      if (final === null) {
        issues.push({ fila: filaNum, campo: mapping.final ?? 'final', valor: String(getVal(mapping.final) ?? ''), tipo: 'error', mensaje: 'Lectura final vacía', solucion: 'Ingresar el valor de lectura final' });
      }
      if (inicial !== null && final !== null && final < inicial) {
        issues.push({ fila: filaNum, campo: 'final', valor: `${inicial} → ${final}`, tipo: 'error', mensaje: 'La lectura final es menor que la inicial', solucion: 'Verificar los valores o marcar como excepción autorizada' });
      }
      // Calculate galones from inicial/final if not provided
      if (galones === null && inicial !== null && final !== null) {
        // galones will be computed later
      }
    }

    if (tipoImportacion === 'galonaje') {
      if (galones === null && inicial === null && final === null && !esVale && !esCarrotanque) {
        issues.push({ fila: filaNum, campo: mapping.galones ?? 'galones', valor: '', tipo: 'error', mensaje: 'No hay datos de galonaje ni lecturas', solucion: 'Verificar que la columna de galones esté mapeada correctamente' });
      }
      if (esVale) {
        issues.push({ fila: filaNum, campo: mapping.producto ?? 'producto', valor: producto ?? '', tipo: 'informacion', mensaje: `El concepto "${producto}" se identificó como vale/ajuste, no como producto de venta`, solucion: 'Se importará como ajuste, no como venta de combustible' });
      }
      if (esCarrotanque) {
        issues.push({ fila: filaNum, campo: mapping.producto ?? 'producto', valor: producto ?? '', tipo: 'informacion', mensaje: `El concepto "${producto}" se identificó como entrada de carrotanque`, solucion: 'Se clasificará como entrada de combustible, no como venta' });
      }
    }

    // Determine row state
    const hasErrors = issues.some((i) => i.tipo === 'error');
    const hasWarnings = issues.some((i) => i.tipo === 'advertencia');
    const estado = hasErrors ? 'error' : hasWarnings ? 'advertencia' : 'valido';

    // Skip completely empty rows
    const isEmpty = !fecha && !turno && !producto && !manguera && galones === null && inicial === null && final === null;
    if (isEmpty) return;

    // Compute galones from inicial/final if not directly provided
    let computedGalones = galones;
    if (computedGalones === null && inicial !== null && final !== null && final >= inicial) {
      computedGalones = final - inicial;
    }

    // For vales/carrotanques, don't normalize as a product name
    const finalProducto = esVale || esCarrotanque ? producto : (producto ? normalizeProductName(producto) : null);

    rows.push({
      fila: filaNum,
      fecha,
      turno,
      producto: finalProducto,
      manguera,
      estacion,
      inicial,
      final,
      galones: computedGalones,
      acumulado,
      diferencia,
      empleado,
      precio,
      esVale,
      esCarrotanque,
      estado,
      issues,
    });

    allIssues.push(...issues);
  });

  return { rows, issues: allIssues, unusedColumns };
}

// Normalize product names
export function normalizeProductName(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes('corriente') || n === 'cte' || n === 'c') return 'Corriente';
  if (n.includes('acpm') || n.includes('diesel') || n === 'a') return 'ACPM';
  if (n.includes('extra') || n === 'ext' || n === 'e') return 'Extra';
  if (n.includes('premium') || n === 'p') return 'Premium';
  if (n.includes('super')) return 'Super';
  return name.trim();
}

// Detect potential duplicate rows
export function detectDuplicates(rows: ParsedRow[]): number {
  const seen = new Set<string>();
  let dupCount = 0;
  rows.forEach((r) => {
    if (!r.fecha || r.estado === 'error') return;
    const key = `${r.fecha}|${r.turno ?? ''}|${r.manguera ?? ''}|${r.producto ?? ''}`;
    if (seen.has(key)) {
      dupCount++;
      r.issues.push({ fila: r.fila, campo: '', valor: '', tipo: 'advertencia', mensaje: 'Posible registro duplicado', solucion: 'Omitir, actualizar o importar con autorización' });
      if (r.estado === 'valido') r.estado = 'advertencia';
    } else {
      seen.add(key);
    }
  });
  return dupCount;
}

// Check if file hash was already imported
export async function checkDuplicateImport(fileHash: string, supabase: { from: (t: string) => { select: (c: string) => { eq: (col: string, val: string) => Promise<{ data: unknown[] | null }> } } }): Promise<boolean> {
  const { data } = await supabase.from('est_import_batches').select('id').eq('file_hash', fileHash);
  return (data?.length ?? 0) > 0;
}

// Export errors as CSV for download
export function exportIssuesCSV(issues: ValidationIssue[]): string {
  const headers = ['Fila', 'Campo', 'Valor', 'Tipo', 'Mensaje', 'Solucion sugerida'];
  const lines = [headers.join(',')];
  issues.forEach((i) => {
    const row = [i.fila, `"${i.campo}"`, `"${i.valor}"`, i.tipo, `"${i.mensaje}"`, `"${i.solucion}"`];
    lines.push(row.join(','));
  });
  return lines.join('\n');
}
