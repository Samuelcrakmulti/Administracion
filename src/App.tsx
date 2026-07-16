import { useState, useEffect } from 'react'
import {
  Fuel,
  Clock,
  BarChart3,
  History,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  Building2,
  ClipboardCheck,
} from 'lucide-react'
import EstOperacion from './pages/EstOperacion'
import EstHistorial from './pages/EstHistorial'
import EstValidaciones from './pages/EstValidaciones'
import EstAprobacion from './pages/EstAprobacion'

type Page = 'operacion' | 'aprobacion' | 'historial' | 'validaciones'

const NAV_ITEMS = [
  { id: 'operacion' as Page, label: 'Operación Diaria', icon: Fuel, desc: 'Turnos y lecturas' },
  { id: 'aprobacion' as Page, label: 'Aprobación de Turnos', icon: ClipboardCheck, desc: 'Revisión supervisor' },
  { id: 'historial' as Page, label: 'Historial', icon: History, desc: 'Turnos pasados' },
  { id: 'validaciones' as Page, label: 'Validaciones', icon: ShieldCheck, desc: 'Control de calidad' },
]

export default function App() {
  const [page, setPage] = useState<Page>('operacion')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const current = NAV_ITEMS.find((n) => n.id === page)!

  return (
    <div className="flex min-h-screen bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 flex flex-col transition-transform duration-300
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Fuel className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight">NexoPyme AI</p>
            <p className="text-slate-400 text-xs truncate">Estaciones de Servicio</p>
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-widest font-semibold">
            <BarChart3 className="w-3.5 h-3.5" />
            Operación Diaria
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => { setPage(item.id); setSidebarOpen(false) }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                  ${active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }
                `}
              >
                <Icon className="flex-shrink-0" size={18} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className={`text-xs ${active ? 'text-blue-200' : 'text-slate-500'}`}>
                    {item.desc}
                  </p>
                </div>
                {active && <ChevronRight className="w-4 h-4 opacity-60" />}
              </button>
            )
          })}
        </nav>

        <div className="px-5 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building2 className="w-3.5 h-3.5" />
            <span>Módulo Premium v2.0</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Fuel className="w-4 h-4" />
            <span>Estaciones de Servicio</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-800">{current.label}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <LiveClock />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {page === 'operacion' && <EstOperacion />}
          {page === 'aprobacion' && <EstAprobacion />}
          {page === 'historial' && <EstHistorial />}
          {page === 'validaciones' && <EstValidaciones />}
        </main>
      </div>
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return <span className="text-xs font-mono text-slate-600">{time}</span>
}
