'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/lib/supabase';

interface AuthContextType {
  member: Member | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ member: null, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMember = async (userId: string) => {
    const { data } = await supabase.from('members').select('*').eq('id', userId).maybeSingle();
    setMember(data);
  };

  const refresh = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadMember(user.id);
    else setMember(null);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadMember(user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (() => {
        if (session?.user) loadMember(session.user.id);
        else setMember(null);
      })();
    });
    return () => subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={{ member, loading, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
