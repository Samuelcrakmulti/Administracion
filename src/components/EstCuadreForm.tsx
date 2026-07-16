import { useState } from 'react'
import {
  DollarSign,
  CreditCard,
  Smartphone,
  Building,
  Banknote,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Loader2,
  Droplets,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { EstTurno, EstLectura } from '../types/estaciones'
import { formatCurrency, formatNumber } from '../lib/utils'

interface Props {
  turno: EstTurno
  lecturas: EstLectura[]
  onComplete: () => void
}

const PAYMENT_FIELDS = [
  { key: 'efectivo', label: 'Efectivo', icon: Banknote },
  { key: 'tarjetas_credito', label: 'Tarjetas Crédito', icon: CreditCard },
  { key: 'tarjetas_debito', label: 'Tarjetas Débito', icon: CreditCard },
  { key: 'transferencias', label: 'Transferencias', icon: TrendingUp },
  { key: 'qr', label: 'QR / Código QR', icon: Smartphone },
  { key: 'credito_empresas', label: 'Crédito Empresas', icon: Building },
  { key: 'otros', label: 'Otros', icon: DollarSign },
] as const

type PaymentKey = typeof PAYMENT_FIELDS[number]['key']

export default function EstCuadreForm({ turno, lecturas, onComplete }: Props) {
  const ventasEsperadas = lecturas.reduce((acc, l) => acc + (l.venta_total ?? 0), 0)

  const [payments, setPayments] = useState<Record<PaymentKey, string>>({
    efectivo: '',
    tarjetas_credito: '',
    tarjetas_debito: '',
    transferencias: '',
    qr: '',
    credito_empresas: '',
    otros: '',
  })
  const [observaciones, setObservaciones] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalEntregado = PAYMENT_FIELDS.reduce((acc, f) => {
    return acc + (parseFloat(payments[f.key]) || 0)
  }, 0)

  const diferencia = totalEntregado - ventasEsperadas
  const resultado: 'correcto' | 'faltante' | 'sobrante' =
    Math.abs(diferencia) < 0.01 ? 'correcto' : diferencia > 0 ? 'sobrante' : 'faltante'

  const handleSave = async () => {
    if (resultado !== 'correcto' && !observaciones.trim()) {
      setError('Debe escribir una observación cuando existe diferencia.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { error: cuadreErr } = await supabase.from('est_cuadres').insert({
        turno_id: turno.id,
        estacion_id: turno.estacion_id,
        ventas_esperadas: ventasEsperadas,
        efectivo: parseFloat(payments.efectivo) || 0,
        tarjetas_credito: parseFloat(payments.tarjetas_credito) || 0,
        tarjetas_debito: parseFloat(payments.tarjetas_debito) || 0,
        transferencias: parseFloat(payments.transferencias) || 0,
        qr: parseFloat(payments.qr) || 0,
        credito_empresas: parseFloat(payments.credito_empresas) || 0,
        otros: parseFloat(payments.otros) || 0,
        total_entregado: totalEntregado,
        diferencia,
        resultado,
        observaciones_cuadre: observaciones.trim() || null,
      })
      if (cuadreErr) throw cuadreErr
      onComplete()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 fade-in">
      {/* Resumen ventas */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Resumen de Ventas
        </h3>
        <ResumenVentas lecturas={lecturas} />
      </div>

      {/* Cuadre */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Cuadre de Caja
          </h3>
          <div className="text-right">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Ventas Esperadas</p>
            <p className="text-2xl font-bold font-mono text-slate-800">{formatCurrency(ventasEsperadas)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {PAYMENT_FIELDS.map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <label className="label flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                {label}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                <input
                  type="number" min="0" step="100"
                  className="input pl-7"
                  placeholder="0"
                  value={payments[key]}
                  onChange={(e) => setPayments((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Ventas esperadas</span>
            <span className="font-mono font-semibold text-slate-800">{formatCurrency(ventasEsperadas)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Total entregado</span>
            <span className="font-mono font-semibold text-slate-800">{formatCurrency(totalEntregado)}</span>
          </div>
          <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Diferencia</span>
            <span className={`font-mono font-bold text-lg ${
              resultado === 'correcto' ? 'text-emerald-600' :
              resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600'
            }`}>
              {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
            </span>
          </div>
        </div>

        {/* Result */}
        <div className={`rounded-xl p-4 mb-4 flex items-center gap-3 ${
          resultado === 'correcto' ? 'bg-emerald-50 border border-emerald-200' :
          resultado === 'sobrante' ? 'bg-blue-50 border border-blue-200' :
          'bg-red-50 border border-red-200'
        }`}>
          {resultado === 'correcto'
            ? <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            : <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600'}`} />
          }
          <div>
            <p className={`font-bold ${
              resultado === 'correcto' ? 'text-emerald-700' :
              resultado === 'sobrante' ? 'text-blue-700' : 'text-red-700'
            }`}>
              {resultado === 'correcto' ? 'Cuadre Correcto' :
               resultado === 'sobrante' ? `Sobrante: ${formatCurrency(Math.abs(diferencia))}` :
               `Faltante: ${formatCurrency(Math.abs(diferencia))}`}
            </p>
            <p className={`text-xs ${
              resultado === 'correcto' ? 'text-emerald-600' :
              resultado === 'sobrante' ? 'text-blue-600' : 'text-red-600'
            }`}>
              {resultado === 'correcto'
                ? 'El dinero entregado coincide exactamente con las ventas registradas.'
                : resultado === 'sobrante'
                ? 'Se entregó más dinero del esperado según las ventas registradas.'
                : 'Se entregó menos dinero del esperado según las ventas registradas.'}
            </p>
          </div>
        </div>

        <div>
          <label className="label">
            Observaciones{resultado !== 'correcto' && <span className="text-red-500 ml-1">* Requerido</span>}
          </label>
          <textarea
            className={`input resize-none ${resultado !== 'correcto' && !observaciones.trim() ? 'border-amber-300' : ''}`}
            rows={3}
            placeholder={resultado !== 'correcto' ? 'Explique la diferencia encontrada...' : 'Observaciones del cuadre (opcional)'}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />
        </div>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="mt-4 flex justify-end">
          <button className="btn-primary flex items-center gap-2" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Guardar Cuadre y Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

function ResumenVentas({ lecturas }: { lecturas: EstLectura[] }) {
  const byProducto: Record<string, { galones: number; ventas: number; color: string }> = {}
  const bySurtidor: Record<string, { nombre: string; numero: number; galones: number; ventas: number; mangueras: number }> = {}

  lecturas.forEach((l) => {
    const prod = l.nombre_producto ?? 'Sin producto'
    if (!byProducto[prod]) byProducto[prod] = { galones: 0, ventas: 0, color: l.color_producto }
    byProducto[prod].galones += l.litros_vendidos ?? 0
    byProducto[prod].ventas += l.venta_total ?? 0

    if (!bySurtidor[l.surtidor_id]) bySurtidor[l.surtidor_id] = { nombre: l.nombre_surtidor, numero: l.numero_surtidor, galones: 0, ventas: 0, mangueras: 0 }
    bySurtidor[l.surtidor_id].galones += l.litros_vendidos ?? 0
    bySurtidor[l.surtidor_id].ventas += l.venta_total ?? 0
    bySurtidor[l.surtidor_id].mangueras += 1
  })

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Por Producto</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(byProducto).map(([nombre, data]) => (
            <div key={nombre} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                <span className="text-xs font-semibold text-slate-700">{nombre}</span>
              </div>
              <p className="font-mono font-bold text-slate-800 text-sm">{formatCurrency(data.ventas)}</p>
              <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                <Droplets className="w-3 h-3" />
                {formatNumber(data.galones, 2)} gal
              </p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Por Surtidor</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(bySurtidor).sort((a, b) => a[1].numero - b[1].numero).map(([id, data]) => (
            <div key={id} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-1">Surtidor {data.numero}</p>
              <p className="font-mono font-bold text-blue-800 text-sm">{formatCurrency(data.ventas)}</p>
              <p className="text-xs text-blue-600 font-mono">{formatNumber(data.galones, 2)} gal</p>
              <p className="text-xs text-blue-400">{data.mangueras} mangueras</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
