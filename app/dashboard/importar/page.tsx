'use client';

import { useState, useEffect } from 'react';
import { Upload, History, Loader2 } from 'lucide-react';
import { ImportWizard } from '@/components/dashboard/import/import-wizard';
import { ImportHistory } from '@/components/dashboard/import/import-history';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

type Estacion = { id: string; nombre: string };
type Producto = { id: string; nombre: string };
type Manguera = { id: string; numero: number; producto_id: string | null };

type TabKey = 'importar' | 'historial';

export default function ImportarDatosPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('importar');
  const [estaciones, setEstaciones] = useState<Estacion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mangueras, setManguera] = useState<Manguera[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [est, prod, mang] = await Promise.all([
        supabase.from('estaciones').select('id, nombre').order('created_at'),
        supabase.from('est_productos').select('id, nombre').order('nombre'),
        supabase.from('est_mangueras').select('id, numero, producto_id').order('numero'),
      ]);
      setEstaciones((est.data as Estacion[]) ?? []);
      setProductos((prod.data as Producto[]) ?? []);
      setManguera((mang.data as Manguera[]) ?? []);
      setLoading(false);
    }
    if (user) loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-soft">
          <Upload className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Importar datos históricos</h1>
          <p className="text-sm text-slate-500">Carga archivos Excel con datos históricos de galonaje e iniciales</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('importar')}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
            activeTab === 'importar'
              ? 'bg-amber-600 text-white shadow-soft'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <Upload className="h-4 w-4" />
          Nueva importación
        </button>
        <button
          onClick={() => setActiveTab('historial')}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
            activeTab === 'historial'
              ? 'bg-amber-600 text-white shadow-soft'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          )}
        >
          <History className="h-4 w-4" />
          Historial
        </button>
      </div>

      {activeTab === 'importar' && (
        <ImportWizard estaciones={estaciones} productos={productos} mangueras={mangueras} />
      )}
      {activeTab === 'historial' && <ImportHistory />}
    </div>
  );
}
