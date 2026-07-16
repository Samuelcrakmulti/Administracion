'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Empresa = {
  id: string;
  nombre: string;
} | null;

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  empresa: Empresa;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  empresa: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [empresa, setEmpresa] = useState<Empresa>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);

      if (data.session?.user) {
        const { data: emp } = await supabase
          .from('empresas')
          .select('id, nombre')
          .eq('user_id', data.session.user.id)
          .maybeSingle();
        if (mounted) setEmpresa(emp);
      }

      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (!newSession) {
          setEmpresa(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Fetch empresa when session changes
  useEffect(() => {
    if (!session?.user) {
      setEmpresa(null);
      return;
    }

    let mounted = true;

    (async () => {
      const { data: emp } = await supabase
        .from('empresas')
        .select('id, nombre')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (mounted) setEmpresa(emp);
    })();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setEmpresa(null);
  };

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, empresa, loading, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
