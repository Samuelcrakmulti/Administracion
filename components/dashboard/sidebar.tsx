'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Wallet,
  TrendingUp,
  Package,
  Brain,
  FileText,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ParkingSquare,
  UsersRound,
  Fuel,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/dashboard/finanzas', label: 'Finanzas', icon: Wallet },
  { href: '/dashboard/ventas', label: 'Ventas', icon: TrendingUp },
  { href: '/dashboard/inventario', label: 'Inventario', icon: Package },
  { href: '/dashboard/parqueadero', label: 'Parqueadero', icon: ParkingSquare },
  { href: '/dashboard/talento', label: 'Talento Humano', icon: UsersRound },
  { href: '/dashboard/estaciones', label: 'Estaciones de Servicio', icon: Fuel },
  { href: '/dashboard/asistente', label: 'Centro Inteligente', icon: Brain },
  { href: '/dashboard/reportes', label: 'Reportes', icon: FileText },
  { href: '/dashboard/comunidad', label: 'Comunidad', icon: Users },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, empresa, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  const displayName = empresa?.nombre || user?.email?.split('@')[0] || 'Usuario';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-slate-200 bg-white p-2 shadow-soft lg:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5 text-slate-700" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
          <Link href="/" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Menú principal
          </p>
          <ul className="mt-3 space-y-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        active
                          ? 'text-primary'
                          : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    {item.label}
                    {active && (
                      <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User card */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>
              <p className="truncate text-xs text-slate-500">Plan Premium</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-red-500"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
