import { supabase } from './supabase';
import type { Member } from './supabase';

export async function signUp(email: string, password: string, name: string, orbit: string) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, orbit },
    },
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Registration failed' };
  }

  // Ensure a member profile exists for the new auth user.
  // Try an upsert so re-runs or missing trigger cases are handled gracefully.
  try {
    await supabase.from('members').upsert({
      id: authData.user.id,
      name,
      email,
      orbit: orbit as any,
      level: 0,
      role: 'MEMBER',
      contribution_score: 0,
      skills: [],
      joined_at: new Date().toISOString(),
    });
  } catch (e) {
    // ignore errors here — the database trigger should create the profile server-side.
  }

  return { user: authData.user };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user, session: data.session };
}

export async function signOut() { await supabase.auth.signOut(); }

export async function getCurrentMember(): Promise<Member | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('members').select('*').eq('id', user.id).maybeSingle();
  return data;
}
