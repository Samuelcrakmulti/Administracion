'use client';

import { useState } from 'react';
import { User, Lock, LogOut, Camera, Save, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';
import { SectionHeader, SettingsCard } from './config-empresa';

export function ConfigCuenta() {
  const { user, signOut } = useAuth();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(false);

  const handleChangePwd = async () => {
    if (!newPwd.trim()) { toast.error('Ingresa la nueva contraseña.'); return; }
    if (newPwd.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (newPwd !== confirmPwd) { toast.error('Las contraseñas no coinciden.'); return; }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setPwdSuccess(true);
      toast.success('Contraseña actualizada correctamente.');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar la contraseña.';
      toast.error(msg);
    } finally {
      setSavingPwd(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const email = user?.email ?? '—';
  const initials = email.slice(0, 2).toUpperCase();
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('es-CO', { dateStyle: 'long' }) : '—';
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—';

  return (
    <div className="space-y-6">
      <SectionHeader icon={<User className="h-5 w-5" />} title="Mi cuenta" description="Información personal y credenciales de acceso" />

      {/* Profile card */}
      <Card className="p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-2xl font-bold text-white shadow-soft">
              {initials}
            </div>
            <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-slate-500 shadow-sm hover:bg-slate-200 transition-colors">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1">
            <p className="text-lg font-bold text-slate-900">{email}</p>
            <p className="text-sm text-slate-500">Usuario de NexoPyme AI</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Cuenta creada: {createdAt}</span>
              <span>·</span>
              <span>Último acceso: {lastSignIn}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200">
            <LogOut className="h-3.5 w-3.5" />Cerrar sesión
          </Button>
        </div>
      </Card>

      {/* Account info */}
      <SettingsCard title="Información de la cuenta">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">Correo electrónico</Label>
          <Input value={email} disabled className="bg-slate-50 text-slate-500" />
          <p className="text-xs text-slate-400">El correo no se puede cambiar desde aquí.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-600">ID de usuario</Label>
          <Input value={user?.id?.slice(0, 16) + '…' ?? '—'} disabled className="bg-slate-50 font-mono text-xs text-slate-400" />
        </div>
      </SettingsCard>

      {/* Password change */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cambiar contraseña</h3>
          {pwdSuccess && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />Actualizada
            </span>
          )}
        </div>
        <div className="space-y-4 p-6">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Nueva contraseña</Label>
            <div className="relative">
              <Input type={showPwd ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Mínimo 6 caracteres" className="pr-10" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-600">Confirmar contraseña</Label>
            <Input type={showPwd ? 'text' : 'password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="Repite la contraseña" />
            {confirmPwd && newPwd !== confirmPwd && (
              <p className="text-xs text-red-500">Las contraseñas no coinciden.</p>
            )}
          </div>

          {/* Strength indicator */}
          {newPwd.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500">Fortaleza de la contraseña</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => {
                  const strength = newPwd.length < 6 ? 1 : newPwd.length < 10 ? 2 : /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? 4 : 3;
                  return (
                    <div key={level} className={`h-1.5 flex-1 rounded-full ${level <= strength ? (strength <= 1 ? 'bg-red-400' : strength === 2 ? 'bg-amber-400' : strength === 3 ? 'bg-blue-400' : 'bg-emerald-500') : 'bg-slate-200'}`} />
                  );
                })}
              </div>
              <p className="text-xs text-slate-400">{newPwd.length < 6 ? 'Muy corta' : newPwd.length < 10 ? 'Moderada' : /[A-Z]/.test(newPwd) && /[0-9]/.test(newPwd) ? 'Muy fuerte' : 'Fuerte'}</p>
            </div>
          )}

          <Button onClick={handleChangePwd} disabled={savingPwd || !newPwd || newPwd !== confirmPwd} className="gap-2">
            {savingPwd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Cambiar contraseña
          </Button>
        </div>
      </Card>

      {/* Session info */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Sesión activa</h3>
        </div>
        <div className="space-y-3 p-6">
          <div className="flex items-center justify-between rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">Sesión actual</p>
                <p className="text-xs text-slate-500">{lastSignIn}</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Activa</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-1.5 text-red-600 hover:bg-red-50">
            <LogOut className="h-3.5 w-3.5" />Cerrar sesión en todos los dispositivos
          </Button>
        </div>
      </Card>
    </div>
  );
}
