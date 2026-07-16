'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Building2, Globe, Users, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type EmpresaData = {
  id?: string;
  nombre: string;
  razon_social: string;
  nit: string;
  email: string;
  telefono: string;
  sitio_web: string;
  direccion: string;
  ciudad: string;
  pais: string;
  moneda: string;
  zona_horaria: string;
  sector: string;
  empleados: string;
  descripcion: string;
  logo_url: string;
};

const EMPTY: EmpresaData = {
  nombre: '', razon_social: '', nit: '', email: '', telefono: '',
  sitio_web: '', direccion: '', ciudad: '', pais: 'Colombia',
  moneda: 'COP', zona_horaria: 'America/Bogota', sector: '',
  empleados: '', descripcion: '', logo_url: '',
};

interface Props { onRefresh?: () => void }

export function ConfigEmpresa({ onRefresh }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmpresaData>(EMPTY);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('empresas').select('*').maybeSingle();
      if (data) {
        setEmpresaId(data.id);
        setForm({
          nombre: data.nombre ?? '', razon_social: data.razon_social ?? '',
          nit: data.nit ?? '', email: data.email ?? '', telefono: data.telefono ?? '',
          sitio_web: data.sitio_web ?? '', direccion: data.direccion ?? '',
          ciudad: data.ciudad ?? '', pais: data.pais ?? 'Colombia',
          moneda: data.moneda ?? 'COP', zona_horaria: data.zona_horaria ?? 'America/Bogota',
          sector: data.sector ?? '', empleados: data.empleados ?? '',
          descripcion: data.descripcion ?? '', logo_url: data.logo_url ?? '',
        });
      }
      setLoading(false);
    })();
  }, []);

  const set = (k: keyof EmpresaData, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre.trim()) { toast.error('El nombre de la empresa es obligatorio.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (empresaId) {
        const { error } = await supabase.from('empresas').update(payload).eq('id', empresaId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('empresas').insert(payload).select('id').single();
        if (error) throw error;
        setEmpresaId(data.id);
      }
      toast.success('Información de la empresa guardada correctamente.');
      onRefresh?.();
    } catch (err) {
      toast.error('Error al guardar. Intenta de nuevo.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <SectionHeader icon={<Building2 className="h-5 w-5" />} title="Información de la empresa" description="Datos legales y de contacto de tu negocio" />

      {/* Identity */}
      <SettingsCard title="Identidad">
        <Field label="Nombre de la empresa *" value={form.nombre} onChange={(v) => set('nombre', v)} placeholder="NexoPyme Ltda." />
        <Field label="Razón social" value={form.razon_social} onChange={(v) => set('razon_social', v)} placeholder="NexoPyme Soluciones S.A.S." />
        <Field label="NIT / RUT" value={form.nit} onChange={(v) => set('nit', v)} placeholder="901.234.567-8" />
        <Field label="Logo URL" value={form.logo_url} onChange={(v) => set('logo_url', v)} placeholder="https://..." />
      </SettingsCard>

      {/* Contact */}
      <SettingsCard title="Contacto">
        <Field label="Correo empresarial" type="email" value={form.email} onChange={(v) => set('email', v)} placeholder="contacto@empresa.com" />
        <Field label="Teléfono" value={form.telefono} onChange={(v) => set('telefono', v)} placeholder="+57 300 000 0000" />
        <Field label="Sitio web" value={form.sitio_web} onChange={(v) => set('sitio_web', v)} placeholder="https://empresa.com" />
      </SettingsCard>

      {/* Location */}
      <SettingsCard title="Ubicación">
        <Field label="Dirección" value={form.direccion} onChange={(v) => set('direccion', v)} placeholder="Calle 100 # 15-20" />
        <Field label="Ciudad" value={form.ciudad} onChange={(v) => set('ciudad', v)} placeholder="Bogotá" />
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">País</Label>
          <Select value={form.pais} onValueChange={(v) => set('pais', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {['Colombia', 'México', 'Argentina', 'Chile', 'Perú', 'Ecuador', 'Venezuela', 'España'].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      {/* Regional */}
      <SettingsCard title="Configuración regional">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Moneda</Label>
          <Select value={form.moneda} onValueChange={(v) => set('moneda', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[['COP', 'COP — Peso colombiano'], ['USD', 'USD — Dólar'], ['EUR', 'EUR — Euro'], ['MXN', 'MXN — Peso mexicano'], ['ARS', 'ARS — Peso argentino'], ['CLP', 'CLP — Peso chileno']].map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Zona horaria</Label>
          <Select value={form.zona_horaria} onValueChange={(v) => set('zona_horaria', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[['America/Bogota', 'Bogotá (UTC-5)'], ['America/Mexico_City', 'Ciudad de México (UTC-6)'], ['America/Argentina/Buenos_Aires', 'Buenos Aires (UTC-3)'], ['America/Santiago', 'Santiago (UTC-4)'], ['America/Lima', 'Lima (UTC-5)'], ['Europe/Madrid', 'Madrid (UTC+1)']].map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingsCard>

      {/* Business profile */}
      <SettingsCard title="Perfil del negocio">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Sector económico</Label>
          <Select value={form.sector} onValueChange={(v) => set('sector', v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar sector" /></SelectTrigger>
            <SelectContent>
              {['Comercio al por menor', 'Comercio al por mayor', 'Servicios', 'Manufactura', 'Gastronomía y alimentos', 'Tecnología', 'Salud', 'Educación', 'Construcción', 'Transporte', 'Agropecuario', 'Entretenimiento', 'Parqueadero / Estacionamiento', 'Otro'].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Número de empleados</Label>
          <Select value={form.empleados} onValueChange={(v) => set('empleados', v)}>
            <SelectTrigger><SelectValue placeholder="Seleccionar rango" /></SelectTrigger>
            <SelectContent>
              {['1 (Solo yo)', '2-5', '6-10', '11-25', '26-50', '51-100', 'Más de 100'].map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 col-span-2">
          <Label className="text-xs font-semibold text-slate-600">Descripción</Label>
          <textarea
            value={form.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
            placeholder="Breve descripción de tu empresa y sus actividades…"
            rows={3}
            className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </SettingsCard>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────
export function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div><h2 className="text-lg font-bold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{description}</p></div>
    </div>
  );
}

export function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-6 sm:grid-cols-2">
        {children}
      </div>
    </Card>
  );
}

export function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-600">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl p-4 transition-colors hover:bg-slate-50">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${checked ? 'bg-primary' : 'bg-slate-200'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
