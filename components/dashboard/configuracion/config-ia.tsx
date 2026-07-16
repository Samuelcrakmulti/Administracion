'use client';

import { useState } from 'react';
import { Brain, Sparkles, Eye, EyeOff, Save, Loader2, CheckCircle2, XCircle, RefreshCw, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { callGemini } from '@/lib/gemini';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SectionHeader, ToggleRow } from './config-empresa';

const PERSONALIDADES = [
  { value: 'profesional', label: 'Profesional', desc: 'Preciso, técnico y formal' },
  { value: 'ejecutivo', label: 'Ejecutivo', desc: 'Directo y orientado a resultados' },
  { value: 'amigable', label: 'Amigable', desc: 'Cercano, claro y motivador' },
  { value: 'analitico', label: 'Analítico', desc: 'Basado en datos y métricas' },
  { value: 'creativo', label: 'Creativo', desc: 'Innovador y sugerente' },
];

const NIVELES = [
  { value: 'basico', label: 'Básico', desc: 'Resúmenes simples y directos' },
  { value: 'intermedio', label: 'Intermedio', desc: 'Análisis balanceado con contexto' },
  { value: 'avanzado', label: 'Avanzado', desc: 'Análisis profundo y detallado' },
];

interface AISettings {
  api_key: string;
  personalidad: string;
  nivel_detalle: string;
  diagnostico_auto: boolean;
  alertas_inteligentes: boolean;
  predicciones: boolean;
  recomendaciones_auto: boolean;
}

interface Props {
  settings: Partial<AISettings>;
  onSave: (k: string, v: unknown) => Promise<void>;
}

export function ConfigIA({ settings, onSave }: Props) {
  const [apiKey, setApiKey] = useState(settings.api_key ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [personalidad, setPersonalidad] = useState(settings.personalidad ?? 'profesional');
  const [nivel, setNivel] = useState(settings.nivel_detalle ?? 'intermedio');
  const [toggles, setToggles] = useState({
    diagnostico_auto: settings.diagnostico_auto ?? false,
    alertas_inteligentes: settings.alertas_inteligentes ?? true,
    predicciones: settings.predicciones ?? false,
    recomendaciones_auto: settings.recomendaciones_auto ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    const key = apiKey.trim() || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    if (!key) { toast.error('Ingresa una API Key para probar.'); return; }
    setTestStatus('testing'); setTestMsg('');
    try {
      const res = await callGemini(key, 'Responde solo con: "Conexión exitosa con Gemini"');
      setTestStatus('ok'); setTestMsg(res.trim().slice(0, 80));
      toast.success('Conexión exitosa con Gemini.');
    } catch (err) {
      setTestStatus('error');
      setTestMsg(err instanceof Error ? err.message : 'Error desconocido');
      toast.error('No se pudo conectar con Gemini.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave('ai', { api_key: apiKey, personalidad, nivel_detalle: nivel, ...toggles });
    setSaving(false);
    toast.success('Configuración de IA guardada.');
  };

  const setToggle = (k: keyof typeof toggles, v: boolean) => setToggles((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <SectionHeader icon={<Brain className="h-5 w-5" />} title="Inteligencia Artificial" description="Configura el motor de IA y personaliza el comportamiento del asistente" />

      {/* Status banner */}
      <Card className="flex items-center justify-between gap-4 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-white shadow-soft">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-slate-900">Google Gemini AI</p>
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />Motor activo
              </span>
            </div>
            <p className="text-xs text-slate-500">Modelo: gemini-2.0-flash · Modelos de respaldo configurados</p>
          </div>
        </div>
        <Sparkles className="h-5 w-5 text-primary/40" />
      </Card>

      {/* API Key */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">API Key de Gemini</h3>
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza…"
                className="pr-10 font-mono text-sm"
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">Obtén tu API Key en <span className="text-primary">ai.google.dev</span></p>
          </div>

          {/* Test result */}
          {testStatus !== 'idle' && (
            <div className={cn('flex items-start gap-2 rounded-xl p-3 text-xs', testStatus === 'testing' ? 'bg-blue-50 text-blue-700' : testStatus === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
              {testStatus === 'testing' && <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-spin shrink-0" />}
              {testStatus === 'ok' && <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              {testStatus === 'error' && <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              <span>{testStatus === 'testing' ? 'Probando conexión…' : testMsg}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testStatus === 'testing'} className="gap-1.5">
              {testStatus === 'testing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Probar conexión
            </Button>
          </div>
        </div>
      </Card>

      {/* Personality */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Personalidad del asistente</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 p-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {PERSONALIDADES.map((p) => (
            <button key={p.value} type="button" onClick={() => setPersonalidad(p.value)}
              className={cn('flex flex-col items-start rounded-xl border p-4 text-left transition-all', personalidad === p.value ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
              <p className={cn('text-sm font-semibold', personalidad === p.value ? 'text-primary' : 'text-slate-900')}>{p.label}</p>
              <p className="mt-1 text-xs text-slate-500">{p.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Detail level */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Nivel de detalle</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 p-6">
          {NIVELES.map((n) => (
            <button key={n.value} type="button" onClick={() => setNivel(n.value)}
              className={cn('flex flex-col items-start rounded-xl border p-4 text-left transition-all', nivel === n.value ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
              <p className={cn('text-sm font-semibold', nivel === n.value ? 'text-primary' : 'text-slate-900')}>{n.label}</p>
              <p className="mt-1 text-xs text-slate-500">{n.desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Toggles */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Funciones automáticas</h3>
        </div>
        <div className="divide-y divide-slate-100 px-2">
          <ToggleRow label="Diagnóstico automático" description="La IA analiza tu negocio periódicamente sin que lo solicites." checked={toggles.diagnostico_auto} onChange={(v) => setToggle('diagnostico_auto', v)} />
          <ToggleRow label="Alertas inteligentes" description="Recibe alertas cuando la IA detecte anomalías o riesgos." checked={toggles.alertas_inteligentes} onChange={(v) => setToggle('alertas_inteligentes', v)} />
          <ToggleRow label="Predicciones" description="Modelos predictivos basados en el histórico de tu negocio." checked={toggles.predicciones} onChange={(v) => setToggle('predicciones', v)} />
          <ToggleRow label="Recomendaciones automáticas" description="Sugerencias proactivas en el dashboard y módulos." checked={toggles.recomendaciones_auto} onChange={(v) => setToggle('recomendaciones_auto', v)} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
