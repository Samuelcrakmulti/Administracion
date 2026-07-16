'use client';

import { useState } from 'react';
import { Bell, Save, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SectionHeader, ToggleRow } from './config-empresa';

type NotifKeys = 'sistema' | 'financiero' | 'ventas' | 'inventario' | 'parqueadero' | 'asistente' | 'email' | 'whatsapp' | 'telegram' | 'push';

type NotifSettings = Record<NotifKeys, boolean>;

const DEFAULT: NotifSettings = {
  sistema: true, financiero: true, ventas: true, inventario: true,
  parqueadero: true, asistente: true, email: false, whatsapp: false,
  telegram: false, push: false,
};

interface Props {
  settings: Partial<NotifSettings>;
  onSave: (k: string, v: unknown) => Promise<void>;
}

export function ConfigNotificaciones({ settings, onSave }: Props) {
  const [notifs, setNotifs] = useState<NotifSettings>({ ...DEFAULT, ...settings });
  const [saving, setSaving] = useState(false);

  const set = (k: NotifKeys, v: boolean) => setNotifs((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await onSave('notifications', notifs);
    setSaving(false);
    toast.success('Preferencias de notificaciones guardadas.');
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={<Bell className="h-5 w-5" />} title="Notificaciones" description="Controla qué alertas recibes y por qué canales" />

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Alertas del sistema</h3>
        </div>
        <div className="divide-y divide-slate-100 px-2">
          <ToggleRow label="Alertas del sistema" description="Mantenimiento, actualizaciones y avisos de plataforma." checked={notifs.sistema} onChange={(v) => set('sistema', v)} />
          <ToggleRow label="Alertas financieras" description="Movimientos, ingresos, gastos y análisis de caja." checked={notifs.financiero} onChange={(v) => set('financiero', v)} />
          <ToggleRow label="Alertas de ventas" description="Nuevas ventas, metas alcanzadas y tendencias." checked={notifs.ventas} onChange={(v) => set('ventas', v)} />
          <ToggleRow label="Alertas de inventario" description="Stock bajo, productos agotados y vencimientos." checked={notifs.inventario} onChange={(v) => set('inventario', v)} />
          <ToggleRow label="Alertas de parqueadero" description="Cupos llenos, tiempos largos y cobros pendientes." checked={notifs.parqueadero} onChange={(v) => set('parqueadero', v)} />
          <ToggleRow label="Alertas del asistente IA" description="Recomendaciones, diagnósticos y análisis automáticos." checked={notifs.asistente} onChange={(v) => set('asistente', v)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Canales de entrega</h3>
        </div>
        <div className="divide-y divide-slate-100 px-2">
          <ToggleRow label="Correo electrónico" description="Recibe resúmenes y alertas en tu email." checked={notifs.email} onChange={(v) => set('email', v)} />
          <ToggleRow
            label="WhatsApp"
            description="Alertas directas a tu número de WhatsApp. (Próximamente)"
            checked={notifs.whatsapp}
            onChange={(v) => set('whatsapp', v)}
          />
          <ToggleRow
            label="Telegram"
            description="Bot de Telegram para notificaciones instantáneas. (Próximamente)"
            checked={notifs.telegram}
            onChange={(v) => set('telegram', v)}
          />
          <ToggleRow label="Notificaciones Push" description="Alertas en el navegador cuando tengas NexoPyme abierto." checked={notifs.push} onChange={(v) => set('push', v)} />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 px-6">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar preferencias
        </Button>
      </div>
    </div>
  );
}
