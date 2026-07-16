'use client';

import { useState } from 'react';
import { Palette, Save, Loader2, Sun, Moon, Monitor } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SectionHeader } from './config-empresa';

const COLORES = [
  { value: 'azul', label: 'Azul profesional', color: '#2563eb' },
  { value: 'verde', label: 'Verde esmeralda', color: '#10b981' },
  { value: 'naranja', label: 'Naranja energía', color: '#f59e0b' },
  { value: 'rojo', label: 'Rojo corporativo', color: '#ef4444' },
  { value: 'teal', label: 'Teal moderno', color: '#14b8a6' },
  { value: 'slate', label: 'Gris oscuro', color: '#475569' },
];

const FUENTES = [
  { value: 'pequena', label: 'Pequeña (13px)' },
  { value: 'normal', label: 'Normal (14px)' },
  { value: 'grande', label: 'Grande (15px)' },
  { value: 'muy_grande', label: 'Muy grande (16px)' },
];

interface AparienciaSettings {
  tema: string;
  color_primario: string;
  tamano_fuente: string;
  idioma: string;
}

interface Props {
  settings: Partial<AparienciaSettings>;
  onSave: (k: string, v: unknown) => Promise<void>;
}

export function ConfigApariencia({ settings, onSave }: Props) {
  const [tema, setTema] = useState(settings.tema ?? 'claro');
  const [color, setColor] = useState(settings.color_primario ?? 'azul');
  const [fuente, setFuente] = useState(settings.tamano_fuente ?? 'normal');
  const [idioma, setIdioma] = useState(settings.idioma ?? 'es');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave('apariencia', { tema, color_primario: color, tamano_fuente: fuente, idioma });
    setSaving(false);
    toast.success('Preferencias de apariencia guardadas.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={<Palette className="h-5 w-5" />} title="Apariencia" description="Personaliza la apariencia visual de la plataforma" />

      {/* Theme */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tema</h3>
        </div>
        <div className="grid grid-cols-3 gap-3 p-6">
          {[
            { value: 'claro', label: 'Claro', icon: Sun, preview: 'bg-white border border-slate-200' },
            { value: 'oscuro', label: 'Oscuro', icon: Moon, preview: 'bg-slate-900' },
            { value: 'automatico', label: 'Automático', icon: Monitor, preview: 'bg-gradient-to-r from-white to-slate-900' },
          ].map((t) => (
            <button key={t.value} type="button" onClick={() => setTema(t.value)}
              className={cn('flex flex-col items-center gap-3 rounded-xl border p-5 transition-all', tema === t.value ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
              <div className={cn('flex h-14 w-full items-center justify-center rounded-lg', t.preview)}>
                <t.icon className={cn('h-6 w-6', t.value === 'oscuro' ? 'text-white' : 'text-slate-700')} />
              </div>
              <p className={cn('text-sm font-medium', tema === t.value ? 'text-primary' : 'text-slate-700')}>{t.label}</p>
            </button>
          ))}
        </div>
        <div className="bg-amber-50/50 border-t border-amber-200/60 px-6 py-3">
          <p className="text-xs text-amber-700">El modo oscuro estará disponible en la próxima actualización.</p>
        </div>
      </Card>

      {/* Colors */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Color principal</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3">
          {COLORES.map((c) => (
            <button key={c.value} type="button" onClick={() => setColor(c.value)}
              className={cn('flex items-center gap-3 rounded-xl border p-3.5 transition-all', color === c.value ? 'border-slate-400 bg-slate-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}>
              <div className="h-6 w-6 rounded-full shadow-sm flex-shrink-0" style={{ background: c.color }} />
              <div className="text-left">
                <p className={cn('text-sm font-medium', color === c.value ? 'text-slate-900' : 'text-slate-700')}>{c.label}</p>
              </div>
              {color === c.value && <div className="ml-auto h-2 w-2 rounded-full" style={{ background: c.color }} />}
            </button>
          ))}
        </div>
      </Card>

      {/* Typography + Language */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Tipografía e idioma</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">Tamaño de fuente</p>
            <Select value={fuente} onValueChange={setFuente}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUENTES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-600">Idioma de la plataforma</p>
            <Select value={idioma} onValueChange={setIdioma}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English (Próximamente)</SelectItem>
                <SelectItem value="pt">Português (Próximamente)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar apariencia
        </Button>
      </div>
    </div>
  );
}
