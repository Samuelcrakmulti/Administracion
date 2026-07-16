'use client';

import { useState, useCallback } from 'react';
import {
  Brain, Sparkles, Loader2, Download, Printer, RefreshCw,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Lightbulb, Target, Calendar, FileText, ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { callGemini } from '@/lib/gemini';
import { printReport } from '@/lib/print-report';
import { cn } from '@/lib/utils';

type Venta = { id: string; cliente: string; total: number; fecha: string };
type Finanza = { id: string; tipo: string; categoria: string; descripcion: string; valor: number; fecha: string };
type Producto = { id: string; nombre: string; precio_compra: number; precio_venta: number; cantidad: number; stock_minimo: number };
type Detalle = { id: string; producto_id: string; cantidad: number };

interface Props {
  ventas: Venta[];
  finanzas: Finanza[];
  productos: Producto[];
  detalles: Detalle[];
  empresa: string | null;
}

type Recomendacion = { titulo: string; descripcion: string; prioridad: 'alta' | 'media' | 'baja' };
type PlanSemana = { semana: string; acciones: string[] };
type ReporteData = {
  resumen_ejecutivo: string;
  estado_financiero: string;
  estado_comercial: string;
  estado_inventario: string;
  fortalezas: string[];
  debilidades: string[];
  oportunidades: string[];
  riesgos: string[];
  recomendaciones: Recomendacion[];
  plan_accion: PlanSemana[];
  conclusion: string;
};

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

export function ReporteEjecutivo({ ventas, finanzas, productos, detalles, empresa }: Props) {
  const [estado, setEstado] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [reporte, setReporte] = useState<ReporteData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';
  const hayDatos = ventas.length > 0 || productos.length > 0 || finanzas.length > 0;

  const buildPrompt = useCallback(() => {
    const now = new Date();
    const ventasMes = ventas.filter((v) => { const d = new Date(v.fecha + 'T00:00:00'); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const ingresosMes = ventasMes.reduce((s, v) => s + Number(v.total), 0);
    const gastosMes = finanzas.filter((f) => f.tipo === 'Gasto' && new Date(f.fecha + 'T00:00:00').getMonth() === now.getMonth()).reduce((s, f) => s + Number(f.valor), 0);
    const agotados = productos.filter((p) => p.cantidad <= 0);
    const stockBajo = productos.filter((p) => p.cantidad > 0 && p.cantidad <= p.stock_minimo);
    const valorInventario = productos.reduce((s, p) => s + Number(p.precio_venta) * p.cantidad, 0);
    const margenBajo = productos.filter((p) => Number(p.precio_compra) > 0 && (Number(p.precio_venta) - Number(p.precio_compra)) / Number(p.precio_compra) < 0.2);

    const prodVentas: Record<string, number> = {};
    detalles.forEach((d) => { prodVentas[d.producto_id] = (prodVentas[d.producto_id] || 0) + d.cantidad; });
    let topProd = 'N/A'; let topQty = 0;
    Object.entries(prodVentas).forEach(([pid, qty]) => { if (qty > topQty) { topQty = qty; topProd = productos.find((p) => p.id === pid)?.nombre || 'N/A'; } });

    const clientMap: Record<string, number> = {};
    ventas.forEach((v) => { clientMap[v.cliente] = (clientMap[v.cliente] || 0) + 1; });
    const totalClientes = Object.keys(clientMap).length;
    const clientesFrecuentes = Object.values(clientMap).filter((c) => c >= 3).length;

    return `Eres un consultor empresarial senior especializado en microempresas latinoamericanas. Genera un reporte ejecutivo COMPLETO y PROFESIONAL basado en los siguientes datos reales del negocio.

DATOS DEL NEGOCIO:
- Empresa: ${empresa ?? 'Sin nombre'}
- Fecha del análisis: ${now.toLocaleDateString('es-CO', { dateStyle: 'long' })}
- Total de ventas registradas: ${ventas.length} ventas
- Ingresos del mes actual: ${fmt(ingresosMes)}
- Gastos del mes actual: ${fmt(gastosMes)}
- Utilidad del mes: ${fmt(ingresosMes - gastosMes)}
- Total de transacciones financieras: ${finanzas.length}
- Total de productos en inventario: ${productos.length}
- Productos agotados: ${agotados.length}${agotados.length > 0 ? ` (${agotados.map((p) => p.nombre).slice(0, 3).join(', ')})` : ''}
- Productos con stock bajo: ${stockBajo.length}
- Valor total del inventario: ${fmt(valorInventario)}
- Producto más vendido: ${topProd} (${topQty} unidades)
- Clientes únicos: ${totalClientes}
- Clientes frecuentes (3+ compras): ${clientesFrecuentes}
- Productos con margen bajo (<20%): ${margenBajo.length}

INSTRUCCIONES:
1. Analiza todos los datos con pensamiento crítico empresarial.
2. Sé específico con los números reales del negocio.
3. Las recomendaciones deben ser accionables e inmediatas.
4. Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto adicional.

Responde con este JSON exacto:
{
  "resumen_ejecutivo": "Párrafo ejecutivo de 3-4 oraciones con los hallazgos más importantes del negocio.",
  "estado_financiero": "Análisis de 2-3 oraciones del estado financiero con los números reales.",
  "estado_comercial": "Análisis de 2-3 oraciones del estado de ventas y clientes.",
  "estado_inventario": "Análisis de 2-3 oraciones del estado del inventario.",
  "fortalezas": ["Fortaleza 1 específica", "Fortaleza 2", "Fortaleza 3"],
  "debilidades": ["Debilidad 1 específica", "Debilidad 2", "Debilidad 3"],
  "oportunidades": ["Oportunidad 1", "Oportunidad 2", "Oportunidad 3"],
  "riesgos": ["Riesgo 1 específico", "Riesgo 2", "Riesgo 3"],
  "recomendaciones": [
    {"titulo": "Título de la acción", "descripcion": "Descripción concreta de qué hacer y por qué", "prioridad": "alta"},
    {"titulo": "Título 2", "descripcion": "...", "prioridad": "media"},
    {"titulo": "Título 3", "descripcion": "...", "prioridad": "baja"}
  ],
  "plan_accion": [
    {"semana": "Semana 1–2", "acciones": ["Acción concreta 1", "Acción concreta 2"]},
    {"semana": "Semana 3–4", "acciones": ["Acción 3", "Acción 4"]}
  ],
  "conclusion": "Párrafo final de 2-3 oraciones con la perspectiva del negocio para el próximo mes."
}`;
  }, [ventas, finanzas, productos, detalles, empresa]);

  const generarReporte = async () => {
    if (!apiKey) { setEstado('error'); setErrorMsg('NEXT_PUBLIC_GEMINI_API_KEY no está configurada en el archivo .env.'); return; }
    setEstado('loading');
    setErrorMsg('');
    try {
      const raw = await callGemini(apiKey, buildPrompt());
      const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsed: ReporteData = JSON.parse(clean);
      setReporte(parsed);
      setEstado('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ReporteEjecutivo]', msg);
      setErrorMsg(msg);
      setEstado('error');
    }
  };

  function handlePDF() {
    if (!reporte) return;
    const rec = reporte.recomendaciones.map((r) => `<div class="rec-card"><div class="rec-title">${r.titulo}</div><p>${r.descripcion}</p><div class="rec-meta"><span class="badge badge-${r.prioridad === 'alta' ? 'red' : r.prioridad === 'media' ? 'amber' : 'green'}">Prioridad ${r.prioridad}</span></div></div>`).join('');
    const plan = reporte.plan_accion.map((s) => `<h3>${s.semana}</h3><ul class="list-items">${s.acciones.map((a) => `<li>${a}</li>`).join('')}</ul>`).join('');
    const listSection = (title: string, items: string[], badge: string) =>
      `<div class="section"><div class="section-title">${title}</div><ul class="list-items">${items.map((i) => `<li>${i}</li>`).join('')}</ul></div>`;
    printReport('Reporte Ejecutivo IA', empresa, `
<div class="section"><div class="section-title">Resumen Ejecutivo</div><p>${reporte.resumen_ejecutivo}</p></div>
<div class="grid-2">
  <div class="section"><div class="section-title">Estado Financiero</div><p>${reporte.estado_financiero}</p></div>
  <div class="section"><div class="section-title">Estado Comercial</div><p>${reporte.estado_comercial}</p></div>
</div>
<div class="section"><div class="section-title">Estado del Inventario</div><p>${reporte.estado_inventario}</p></div>
<div class="grid-2">
  ${listSection('Fortalezas', reporte.fortalezas, 'green')}
  ${listSection('Debilidades', reporte.debilidades, 'red')}
  ${listSection('Oportunidades', reporte.oportunidades, 'blue')}
  ${listSection('Riesgos', reporte.riesgos, 'amber')}
</div>
<div class="section"><div class="section-title">Recomendaciones Priorizadas</div>${rec}</div>
<div class="section"><div class="section-title">Plan de Acción — Próximos 30 Días</div>${plan}</div>
<div class="section"><div class="section-title">Conclusión Ejecutiva</div><p>${reporte.conclusion}</p></div>`);
  }

  if (!hayDatos) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft"><Brain className="h-7 w-7 text-slate-300" /></div>
        <h3 className="mt-4 text-base font-semibold text-slate-700">Aún no hay datos suficientes</h3>
        <p className="mt-1.5 max-w-sm text-sm text-slate-400">Registra ventas, finanzas y productos para que la IA pueda generar el Reporte Ejecutivo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Reporte Ejecutivo IA</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><Sparkles className="h-3 w-3" />Gemini</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Análisis completo generado por inteligencia artificial con tus datos reales</p>
        </div>
        {estado === 'done' && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={generarReporte} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Regenerar</Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5"><Printer className="h-3.5 w-3.5" />Imprimir</Button>
            <Button size="sm" onClick={handlePDF} className="gap-1.5"><Download className="h-3.5 w-3.5" />Descargar PDF</Button>
          </div>
        )}
      </div>

      {/* Idle state */}
      {estado === 'idle' && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-blue-50/60 via-white to-primary/5 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
            <Brain className="h-8 w-8" />
          </div>
          <h3 className="mt-5 text-xl font-bold text-slate-900">Reporte Ejecutivo con IA</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
            Gemini analizará tus {ventas.length} ventas, {productos.length} productos y {finanzas.length} transacciones financieras para generar un informe ejecutivo profesional con recomendaciones accionables.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-slate-500">
            {['Resumen ejecutivo', 'Estado financiero', 'Fortalezas y debilidades', 'Recomendaciones priorizadas', 'Plan de acción 30 días'].map((item) => (
              <span key={item} className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-500" />{item}</span>
            ))}
          </div>
          <Button onClick={generarReporte} size="lg" className="mt-7 gap-2 shadow-soft">
            <Brain className="h-4 w-4" />Generar Reporte Ejecutivo
          </Button>
        </Card>
      )}

      {/* Loading */}
      {estado === 'loading' && (
        <Card className="flex flex-col items-center justify-center py-20">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
            <Brain className="h-8 w-8" />
            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-soft">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
            </div>
          </div>
          <h3 className="mt-5 text-base font-semibold text-slate-900">Generando reporte ejecutivo…</h3>
          <p className="mt-1.5 text-sm text-slate-400">Gemini está analizando todos los datos de tu empresa</p>
          <div className="mt-6 flex flex-col gap-2 text-xs text-slate-400">
            {['Procesando finanzas y ventas…', 'Analizando inventario y clientes…', 'Redactando recomendaciones…'].map((s) => (
              <div key={s} className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />{s}</div>
            ))}
          </div>
        </Card>
      )}

      {/* Error */}
      {estado === 'error' && (
        <Card className="border-red-200/60 bg-red-50/40 p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600"><AlertTriangle className="h-5 w-5" /></div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Error al generar el reporte</p>
              <p className="mt-1 font-mono text-xs text-red-700">{errorMsg}</p>
              <Button onClick={generarReporte} variant="outline" size="sm" className="mt-4 gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Intentar de nuevo</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Report content */}
      {estado === 'done' && reporte && (
        <div className="space-y-5">
          {/* Executive summary */}
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-6">
            <div className="flex items-center gap-2 text-primary">
              <FileText className="h-4 w-4" /><h3 className="text-sm font-bold uppercase tracking-wider">Resumen Ejecutivo</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{reporte.resumen_ejecutivo}</p>
          </Card>

          {/* States */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <EstadoCard title="Estado Financiero" content={reporte.estado_financiero} icon={<TrendingUp className="h-4 w-4" />} color="emerald" />
            <EstadoCard title="Estado Comercial" content={reporte.estado_comercial} icon={<TrendingUp className="h-4 w-4" />} color="blue" />
            <EstadoCard title="Estado del Inventario" content={reporte.estado_inventario} icon={<TrendingDown className="h-4 w-4" />} color="amber" />
          </div>

          {/* FODA */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FodaCard title="Fortalezas" items={reporte.fortalezas} color="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
            <FodaCard title="Debilidades" items={reporte.debilidades} color="red" icon={<AlertTriangle className="h-4 w-4" />} />
            <FodaCard title="Oportunidades" items={reporte.oportunidades} color="blue" icon={<Lightbulb className="h-4 w-4" />} />
            <FodaCard title="Riesgos" items={reporte.riesgos} color="amber" icon={<AlertTriangle className="h-4 w-4" />} />
          </div>

          {/* Recommendations */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-slate-900">Recomendaciones Priorizadas</h3>
            </div>
            <div className="space-y-3">
              {reporte.recomendaciones.map((r, i) => (
                <div key={i} className={cn('flex items-start gap-3 rounded-xl border p-4', r.prioridad === 'alta' ? 'border-red-200/60 bg-red-50/30' : r.prioridad === 'media' ? 'border-amber-200/60 bg-amber-50/30' : 'border-emerald-200/60 bg-emerald-50/30')}>
                  <span className={cn('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', r.prioridad === 'alta' ? 'bg-red-500' : r.prioridad === 'media' ? 'bg-amber-500' : 'bg-emerald-500')}>{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{r.titulo}</p>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', r.prioridad === 'alta' ? 'bg-red-100 text-red-600' : r.prioridad === 'media' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')}>
                        Prioridad {r.prioridad}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{r.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Action plan */}
          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-slate-900">Plan de Acción — Próximos 30 Días</h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {reporte.plan_accion.map((semana, i) => (
                <div key={i} className="rounded-xl border border-slate-200/60 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-primary">{semana.semana}</p>
                  <ul className="space-y-2">
                    {semana.acciones.map((a, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-slate-600">
                        <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />{a}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          {/* Conclusion */}
          <Card className="border-slate-200/60 bg-slate-50/50 p-6">
            <div className="flex items-center gap-2 text-slate-600">
              <Brain className="h-4 w-4" /><h3 className="text-sm font-bold uppercase tracking-wider">Conclusión Ejecutiva</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{reporte.conclusion}</p>
            <p className="mt-4 text-right text-xs text-slate-400">Generado por Gemini AI · {new Date().toLocaleDateString('es-CO', { dateStyle: 'long' })}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function EstadoCard({ title, content, icon, color }: { title: string; content: string; icon: React.ReactNode; color: string }) {
  const cm: Record<string, { bg: string; text: string; light: string }> = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50' },
  };
  const c = cm[color];
  return (
    <Card className="p-5">
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', c.light, c.text)}>{icon}</div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{content}</p>
    </Card>
  );
}

function FodaCard({ title, items, color, icon }: { title: string; items: string[]; color: string; icon: React.ReactNode }) {
  const cm: Record<string, { bg: string; text: string; light: string; border: string }> = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200/60' },
    red: { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50', border: 'border-red-200/60' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200/60' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200/60' },
  };
  const c = cm[color];
  return (
    <Card className={cn('border p-5', c.border)}>
      <div className="mb-3 flex items-center gap-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', c.light, c.text)}>{icon}</div>
        <h3 className={cn('text-sm font-bold', c.text)}>{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
            <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', c.bg)} />{item}
          </li>
        ))}
      </ul>
    </Card>
  );
}
