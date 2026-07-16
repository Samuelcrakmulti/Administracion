'use client';

import { useState } from 'react';
import { Brain, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { callGemini } from '@/lib/gemini';
import { cn } from '@/lib/utils';

type Empleado = { id: string; nombre: string; apellido: string; cargo: string; salario: number; estado: string; fecha_ingreso: string };
type Asistencia = { empleado_id: string; fecha: string; horas_trabajadas: number | null; estado: string };
type Nomina = { empleado_id: string; mes: number; anio: number; total: number; estado: string };

type Message = { role: 'assistant' | 'user'; content: string };

const SUGERENCIAS = [
  '¿Quién llegó tarde esta semana?',
  '¿Cuánto debo pagar de nómina este mes?',
  '¿Qué empleado ha faltado más?',
  '¿Quién tiene vacaciones pendientes?',
  '¿Cuánto cuesta mantener el equipo?',
  'Dame un diagnóstico general del equipo',
];

function buildContext(empleados: Empleado[], asistencias: Asistencia[], nominas: Nomina[]): string {
  const ahora = new Date();
  const totalNomina = nominas.filter((n) => n.mes === ahora.getMonth() + 1 && n.anio === ahora.getFullYear()).reduce((s, n) => s + n.total, 0);
  const hoy = ahora.toISOString().split('T')[0];
  const asistHoy = asistencias.filter((a) => a.fecha === hoy);
  const tardanzas30 = asistencias.filter((a) => { const d = new Date(a.fecha + 'T00:00:00'); return a.estado === 'tarde' && (ahora.getTime() - d.getTime()) < 30 * 86400000; });
  const ausencias30 = asistencias.filter((a) => { const d = new Date(a.fecha + 'T00:00:00'); return a.estado === 'ausente' && (ahora.getTime() - d.getTime()) < 30 * 86400000; });

  let ctx = `Eres el Asistente de Recursos Humanos de NexoPyme AI. Responde en español, de forma clara y útil.\n\n`;
  ctx += `DATOS DEL EQUIPO:\n`;
  ctx += `- Total empleados: ${empleados.length}\n`;
  ctx += `- Activos: ${empleados.filter((e) => e.estado === 'activo').length}\n`;
  ctx += `- En vacaciones: ${empleados.filter((e) => e.estado === 'vacaciones').length}\n`;
  ctx += `- Costo nómina este mes: $${totalNomina.toLocaleString('es-CO')}\n`;
  ctx += `- Presentes hoy: ${asistHoy.filter((a) => a.estado !== 'ausente').length}\n`;
  ctx += `- Tardanzas últimos 30 días: ${tardanzas30.length}\n`;
  ctx += `- Ausencias últimos 30 días: ${ausencias30.length}\n\n`;

  if (empleados.length > 0) {
    ctx += `EMPLEADOS:\n`;
    empleados.slice(0, 10).forEach((e) => {
      ctx += `- ${e.nombre} ${e.apellido} (${e.cargo}) — Estado: ${e.estado} — Salario: $${e.salario.toLocaleString('es-CO')} — Ingresó: ${e.fecha_ingreso}\n`;
    });
    ctx += '\n';
  }

  return ctx;
}

interface Props {
  empleados: Empleado[];
  asistencias: Asistencia[];
  nominas: Nomina[];
}

export function TalentoIA({ empleados, asistencias, nominas }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages((p) => [...p, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const context = buildContext(empleados, asistencias, nominas);
      const historyText = messages.slice(-6).map((m) => `${m.role === 'user' ? 'Usuario' : 'IA'}: ${m.content}`).join('\n');
      const prompt = `${context}${historyText ? `\nCONVERSACIÓN PREVIA:\n${historyText}\n\n` : ''}Usuario: ${text.trim()}\n\nAsistente:`;
      const reply = await callGemini(apiKey, prompt);
      setMessages((p) => [...p, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((p) => [...p, { role: 'assistant', content: 'No pude conectarme a Gemini. Verifica tu API Key en Configuración > Inteligencia Artificial.' }]);
    } finally { setLoading(false); }
  };

  const generateInsights = async () => {
    setInsightLoading(true);
    try {
      const context = buildContext(empleados, asistencias, nominas);
      const prompt = `${context}\nGenera 5 análisis o diagnósticos importantes sobre el equipo de trabajo. Sé específico, usa los datos reales. Cada punto en una línea separada, máximo 2 oraciones por punto. Formato: "• [diagnóstico]"`;
      const reply = await callGemini(apiKey, prompt);
      setMessages([{ role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages([{ role: 'assistant', content: 'No pude generar el diagnóstico. Verifica tu API Key en Configuración > Inteligencia Artificial.' }]);
    } finally { setInsightLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="flex items-center justify-between gap-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-slate-900">Asistente de Recursos Humanos</p>
            <p className="text-xs text-slate-500">Powered by Google Gemini · Analiza tu equipo en tiempo real</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={generateInsights} disabled={insightLoading} className="gap-2 shrink-0">
          {insightLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Diagnóstico automático
        </Button>
      </Card>

      {/* Chat */}
      <Card className="overflow-hidden">
        {/* Messages */}
        <div className="h-96 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Brain className="h-12 w-12 text-slate-200" />
              <p className="mt-3 text-sm font-medium text-slate-700">Asistente de RRHH listo</p>
              <p className="mt-1 text-xs text-slate-400">Presiona "Diagnóstico automático" o haz una pregunta sobre tu equipo.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Brain className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={cn('max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                m.role === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-slate-100 text-slate-800 rounded-tl-sm')}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Brain className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-slate-100 px-4 py-3">
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Pregunta sobre tu equipo…" className="flex-1" disabled={loading} />
            <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="gap-2 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>

      {/* Suggestions */}
      <div>
        <p className="mb-2.5 text-xs font-semibold text-slate-500">Preguntas frecuentes</p>
        <div className="flex flex-wrap gap-2">
          {SUGERENCIAS.map((s) => (
            <button key={s} type="button" onClick={() => sendMessage(s)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
