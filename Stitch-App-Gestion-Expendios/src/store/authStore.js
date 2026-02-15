import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
    user: null,
    session: null,
    role: null,
    loading: true,

    initialize: async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            let role = null;
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single();
                role = profile?.role;
            }

            set({ session, user: session?.user ?? null, role, loading: false });

            supabase.auth.onAuthStateChange(async (_event, session) => {
                let role = null;
                if (session?.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    role = profile?.role;
                }
                set({ session, user: session?.user ?? null, role });
            });
        } catch (error) {
            console.error('Error initializing auth:', error);
            set({ loading: false });
        }
    },

    signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;

        // Fetch role immediately after sign in
        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();
            set({ role: profile?.role });
            return { ...data, role: profile?.role };
        }
        return data;
    },

    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({ session: null, user: null, role: null });
    },
}));
