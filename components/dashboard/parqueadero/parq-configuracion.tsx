'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Settings, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type Config = {
  id?: string; total_cupos: number; tiempo_gracia_min: number;
  iva_pct: number; horario_apertura: string; horario_cierre: string;
};
type Tarifa = {
  id?: string; tipo_vehiculo: string; tarifa_primera_hora: number;
  tarifa_hora_adicional: number; tarifa_maxima_dia: number;
};

const TIPOS = [
  { value: 'automovil', label: 'Automóvil' },
  { value: 'motocicleta', label: 'Motocicleta' },
  { value: 'bicicleta', label: 'Bicicleta' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'camion', label: 'Camión' },
];

const DEFAULT_TARIFAS: Tarifa[] = [
  { tipo_vehiculo: 'automovil', tarifa_primera_hora: 3000, tarifa_hora_adicional: 2000, tarifa_maxima_dia: 25000 },
  { tipo_vehiculo: 'motocicleta', tarifa_primera_hora: 1500, tarifa_hora_adicional: 1000, tarifa_maxima_dia: 12000 },
  { tipo_vehiculo: 'bicicleta', tarifa_primera_hora: 500, tarifa_hora_adicional: 500, tarifa_maxima_dia: 5000 },
  { tipo_vehiculo: 'camioneta', tarifa_primera_hora: 4000, tarifa_hora_adicional: 3000, tarifa_maxima_dia: 35000 },
  { tipo_vehiculo: 'camion', tarifa_primera_hora: 6000, tarifa_hora_adicional: 4000, tarifa_maxima_dia: 50000 },
];

interface Props {
  config: Config | null;
  tarifas: Tarifa[];
  onSaved: () => void;
}

function fmt(v: number) {
  return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

export function ParqConfiguracion({ config: configProp, tarifas: tarifasProp, onSaved }: Props) {
  const [config, setConfig] = useState<Config>(configProp ?? {
    total_cupos: 50, tiempo_gracia_min: 15, iva_pct: 0,
    horario_apertura: '06:00', horario_cierre: '22:00',
  });
  const [tarifas, setTarifas] = useState<Tarifa[]>(
    TIPOS.map((t) => tarifasProp.find((tp) => tp.tipo_vehiculo === t.value) ?? DEFAULT_TARIFAS.find((d) => d.tipo_vehiculo === t.value)!)
  );
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingTarifas, setSavingTarifas] = useState(false);

  useEffect(() => {
    if (configProp) setConfig(configProp);
  }, [configProp]);
  useEffect(() => {
    setTarifas(TIPOS.map((t) => tarifasProp.find((tp) => tp.tipo_vehiculo === t.value) ?? DEFAULT_TARIFAS.find((d) => d.tipo_vehiculo === t.value)!));
  }, [tarifasProp]);

  const setC = (k: keyof Config, v: string | number) => setConfig((p) => ({ ...p, [k]: v }));
  const setT = (tipo: string, k: keyof Tarifa, v: number) =>
    setTarifas((prev) => prev.map((t) => t.tipo_vehiculo === tipo ? { ...t, [k]: v } : t));

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      if (config.id) {
        const { error } = await supabase.from('parqueadero_config').update({ ...config, updated_at: new Date().toISOString() }).eq('id', config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('parqueadero_config').insert({ ...config }).select('id').single();
        if (error) throw error;
        setConfig((p) => ({ ...p, id: data.id }));
      }
      toast.success('Configuración guardada.');
      onSaved();
    } catch (err) {
      toast.error('Error al guardar la configuración.');
      console.error(err);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveTarifas = async () => {
    setSavingTarifas(true);
    try {
      for (const t of tarifas) {
        const { error } = await supabase.from('parqueadero_tarifas').upsert({
          tipo_vehiculo: t.tipo_vehiculo,
          tarifa_primera_hora: t.tarifa_primera_hora,
          tarifa_hora_adicional: t.tarifa_hora_adicional,
          tarifa_maxima_dia: t.tarifa_maxima_dia,
        }, { onConflict: 'user_id,tipo_vehiculo' });
        if (error) throw error;
      }
      toast.success('Tarifas guardadas.');
      onSaved();
    } catch (err) {
      toast.error('Error al guardar las tarifas.');
      console.error(err);
    } finally {
      setSavingTarifas(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General config */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"><Settings className="h-4 w-4 text-slate-600" /></div>
          <h3 className="text-base font-bold text-slate-900">Configuración general</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Total de cupos del parqueadero</Label>
            <Input type="number" min={1} max={9999} value={config.total_cupos}
              onChange={(e) => setC('total_cupos', parseInt(e.target.value) || 50)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Tiempo de gracia (minutos)</Label>
            <Input type="number" min={0} max={60} value={config.tiempo_gracia_min}
              onChange={(e) => setC('tiempo_gracia_min', parseInt(e.target.value) || 0)} />
            <p className="text-xs text-slate-400">Minutos sin cobro desde el ingreso</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">IVA (%)</Label>
            <Input type="number" min={0} max={100} step={0.1} value={config.iva_pct}
              onChange={(e) => setC('iva_pct', parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Horario</Label>
            <div className="flex items-center gap-2">
              <Input type="time" value={config.horario_apertura} onChange={(e) => setC('horario_apertura', e.target.value)} className="flex-1" />
              <span className="text-slate-400">–</span>
              <Input type="time" value={config.horario_cierre} onChange={(e) => setC('horario_cierre', e.target.value)} className="flex-1" />
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={handleSaveConfig} disabled={savingConfig} className="gap-2">
            {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar configuración
          </Button>
        </div>
      </Card>

      {/* Tarifas */}
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Tarifas por tipo de vehículo</h3>
            <p className="text-xs text-slate-400">Configura el precio por primera hora, horas adicionales y máximo diario</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tipo</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Primera hora</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hora adicional</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Máximo diario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tarifas.map((t) => (
                <tr key={t.tipo_vehiculo} className="group">
                  <td className="py-4 pr-4">
                    <span className="text-sm font-semibold text-slate-900">
                      {TIPOS.find((tp) => tp.value === t.tipo_vehiculo)?.label || t.tipo_vehiculo}
                    </span>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">$</span>
                      <Input type="number" min={0} value={t.tarifa_primera_hora}
                        onChange={(e) => setT(t.tipo_vehiculo, 'tarifa_primera_hora', parseInt(e.target.value) || 0)}
                        className="w-28 text-sm" />
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">$</span>
                      <Input type="number" min={0} value={t.tarifa_hora_adicional}
                        onChange={(e) => setT(t.tipo_vehiculo, 'tarifa_hora_adicional', parseInt(e.target.value) || 0)}
                        className="w-28 text-sm" />
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">$</span>
                      <Input type="number" min={0} value={t.tarifa_maxima_dia}
                        onChange={(e) => setT(t.tipo_vehiculo, 'tarifa_maxima_dia', parseInt(e.target.value) || 0)}
                        className="w-28 text-sm" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Preview */}
        <div className="mt-4 rounded-xl bg-slate-50/50 p-4">
          <p className="mb-3 text-xs font-semibold text-slate-500">Vista previa de cobros estimados</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {tarifas.map((t) => (
              <div key={t.tipo_vehiculo} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                <p className="text-xs font-medium text-slate-600">{TIPOS.find((tp) => tp.value === t.tipo_vehiculo)?.label}</p>
                <p className="mt-1 text-sm font-bold text-slate-900">{fmt(t.tarifa_primera_hora)}</p>
                <p className="text-xs text-slate-400">1ra hora</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={handleSaveTarifas} disabled={savingTarifas} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            {savingTarifas ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar tarifas
          </Button>
        </div>
      </Card>
    </div>
  );
}
