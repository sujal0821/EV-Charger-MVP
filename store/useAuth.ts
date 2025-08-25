import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/db';

type AuthState = {
  isLoading: boolean;
  session: Session | null;
  profile: Profile | null;
  setSession: (session: Session | null) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  isLoading: true,
  session: null,
  profile: null,
  setSession: (session) => {
    set({ session, isLoading: false });
    if (session?.user) {
      get().refreshProfile();
    }
  },
  refreshProfile: async () => {
    const { session } = get();
    if (!session?.user) {
      set({ profile: null, isLoading: false });
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (error) {
      // Profile load error handled silently
    }
    set({ profile: (data as Profile) ?? null, isLoading: false });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, isLoading: false });
  },
}));

// Initialize session listener once when this module is imported
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Error getting session:', error);
  }
  useAuth.getState().setSession(data.session);
});

supabase.auth.onAuthStateChange((event, session) => {
  useAuth.getState().setSession(session);
});


