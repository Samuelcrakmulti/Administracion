'use client';

import { useState } from 'react';
import { DollarSign, Package, FileText, Save, Loader2, BarChart2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { SectionHeader, ToggleRow } from './config-empresa';

interface ModulosSettings {
  finanzas: {
    moneda: string; iva_default: number;
    metodos_pago: string[]; caja_principal: string;
  };
  inventario: {
    alerta_stock_minimo: number; metodo_valoracion: string;
    unidad_defecto: string; codigo_automatico: boolean;
  };
  reportes: {
    frecuencia: string; formato: string; enviar_email: boolean;
  };
}

const DEFAULTS: ModulosSettings = {
  finanzas: { moneda: 'COP', iva_default: 19, metodos_pago: ['Efectivo', 'Tarjeta', 'QR', 'Transferencia'], caja_principal: 'Caja General' },
  inventario: { alerta_stock_minimo: 5, metodo_valoracion: 'FIFO', unidad_defecto: 'Unidad', codigo_automatico: true },
  reportes: { frecuencia: 'mensual', formato: 'PDF', enviar_email: false },
};

interface Props {
  settings: Partial<ModulosSettings>;
  onSave: (k: string, v: unknown) => Promise<void>;
}

export function ConfigModulos({ settings, onSave }: Props) {
  const [fin, setFin] = useState({ ...DEFAULTS.finanzas, ...settings.finanzas });
  const [inv, setInv] = useState({ ...DEFAULTS.inventario, ...settings.inventario });
  const [rep, setRep] = useState({ ...DEFAULTS.reportes, ...settings.reportes });
  const [savingFin, setSavingFin] = useState(false);
  const [savingInv, setSavingInv] = useState(false);
  const [savingRep, setSavingRep] = useState(false);

  const saveFin = async () => { setSavingFin(true); await onSave('finanzas', fin); setSavingFin(false); toast.success('Configuración de Finanzas guardada.'); };
  const saveInv = async () => { setSavingInv(true); await onSave('inventario', inv); setSavingInv(false); toast.success('Configuración de Inventario guardada.'); };
  const saveRep = async () => { setSavingRep(true); await onSave('reportes', rep); setSavingRep(false); toast.success('Configuración de Reportes guardada.'); };

  return (
    <div className="space-y-10">
      {/* ── FINANZAS ─────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader icon={<DollarSign className="h-5 w-5" />} title="Finanzas" description="Configuración de moneda, impuestos y métodos de pago" />
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Opciones generales</h3>
          </div>
          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Moneda principal</Label>
              <Select value={fin.moneda} onValueChange={(v) => setFin((p) => ({ ...p, moneda: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[['COP', 'COP — Peso colombiano'], ['USD', 'USD — Dólar'], ['EUR', 'EUR — Euro'], ['MXN', 'MXN — Peso mexicano']].map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">IVA predeterminado (%)</Label>
              <Input type="number" min={0} max={100} value={fin.iva_default}
                onChange={(e) => setFin((p) => ({ ...p, iva_default: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Caja principal</Label>
              <Input value={fin.caja_principal} onChange={(e) => setFin((p) => ({ ...p, caja_principal: e.target.value }))} placeholder="Caja General" />
            </div>
          </div>
          <div className="flex justify-end border-t border-slate-100 bg-slate-50/30 px-6 py-3">
            <Button size="sm" onClick={saveFin} disabled={savingFin} className="gap-2">
              {savingFin ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Guardar
            </Button>
          </div>
        </Card>
      </div>

      {/* ── INVENTARIO ───────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader icon={<Package className="h-5 w-5" />} title="Inventario" description="Gestión de stock, valoración y códigos" />
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Opciones de inventario</h3>
          </div>
          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Alerta de stock mínimo (unidades)</Label>
              <Input type="number" min={0} value={inv.alerta_stock_minimo}
                onChange={(e) => setInv((p) => ({ ...p, alerta_stock_minimo: parseInt(e.target.value) || 0 }))} />
              <p className="text-xs text-slate-400">Se mostrará alerta cuando el stock sea igual o menor a este número.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Método de valoración</Label>
              <Select value={inv.metodo_valoracion} onValueChange={(v) => setInv((p) => ({ ...p, metodo_valoracion: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIFO">FIFO — Primero en entrar, primero en salir</SelectItem>
                  <SelectItem value="LIFO">LIFO — Último en entrar, primero en salir</SelectItem>
                  <SelectItem value="Promedio">Promedio ponderado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Unidad de medida predeterminada</Label>
              <Select value={inv.unidad_defecto} onValueChange={(v) => setInv((p) => ({ ...p, unidad_defecto: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Unidad', 'Kilogramo', 'Gramo', 'Litro', 'Mililitro', 'Metro', 'Caja', 'Paquete', 'Par'].map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t border-slate-100 px-2">
            <ToggleRow label="Generar código automático" description="Asigna un SKU automático al registrar nuevos productos." checked={inv.codigo_automatico} onChange={(v) => setInv((p) => ({ ...p, codigo_automatico: v }))} />
          </div>
          <div className="flex justify-end border-t border-slate-100 bg-slate-50/30 px-6 py-3">
            <Button size="sm" onClick={saveInv} disabled={savingInv} className="gap-2">
              {savingInv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Guardar
            </Button>
          </div>
        </Card>
      </div>

      {/* ── REPORTES ─────────────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader icon={<BarChart2 className="h-5 w-5" />} title="Reportes" description="Frecuencia, formato y envío automático" />
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Opciones de reportes</h3>
          </div>
          <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Frecuencia de reportes automáticos</Label>
              <Select value={rep.frecuencia} onValueChange={(v) => setRep((p) => ({ ...p, frecuencia: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diario</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Formato de descarga</Label>
              <Select value={rep.formato} onValueChange={(v) => setRep((p) => ({ ...p, formato: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF</SelectItem>
                  <SelectItem value="Excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="CSV">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t border-slate-100 px-2">
            <ToggleRow label="Enviar reportes automáticamente por correo" description="Recibirás el reporte según la frecuencia configurada." checked={rep.enviar_email} onChange={(v) => setRep((p) => ({ ...p, enviar_email: v }))} />
          </div>
          <div className="flex justify-end border-t border-slate-100 bg-slate-50/30 px-6 py-3">
            <Button size="sm" onClick={saveRep} disabled={savingRep} className="gap-2">
              {savingRep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Guardar
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
