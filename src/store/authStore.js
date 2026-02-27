import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
    user: null,
    session: null,
    role: null,
    hasInitiative: false, // New state for redirection logic
    loading: true,
    initialized: false,
    initializing: false,

    initialize: async () => {
        if (get().initialized || get().initializing) return;
        console.log("AuthStore: initialize started");
        set({ initializing: true });

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            console.log("AuthStore: getSession result", { hasSession: !!session, error: sessionError });

            let role = null;
            let hasInitiative = false;

            if (session?.user) {
                const profileData = await get().fetchProfileWithRetry(session.user.id);
                role = profileData.role;
                hasInitiative = profileData.hasInitiative;
            }

            set({
                session,
                user: session?.user ?? null,
                role,
                hasInitiative,
                loading: false,
                initialized: true,
                initializing: false
            });

            // Set up listener
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log("AuthStore: 🔔 onAuthStateChange EVENT:", event, "User:", session?.user?.id);

                if (event === 'SIGNED_OUT') {
                    set({ session: null, user: null, role: null, hasInitiative: false, loading: false });
                    return;
                }

                if (session?.user) {
                    const profileData = await get().fetchProfileWithRetry(session.user.id);
                    set({
                        session,
                        user: session.user,
                        role: profileData.role,
                        hasInitiative: profileData.hasInitiative,
                        loading: false
                    });
                } else {
                    set({ session: null, user: null, role: null, hasInitiative: false, loading: false });
                }
            });
        } catch (error) {
            console.error('AuthStore: Error initializing auth:', error);
            set({ loading: false, initializing: false, initialized: true });
        }
    },

    fetchProfileWithRetry: async (userId, retries = 3) => {
        console.log(`AuthStore: Fetching profile for user ${userId}, attempt ${4 - retries}`);
        for (let i = 0; i < retries; i++) {
            try {
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', userId)
                    .maybeSingle();

                if (profileError) throw profileError;

                if (profile) {
                    let hasInitiative = false;
                    if (profile.role === 'owner') {
                        const { data: initiative } = await supabase
                            .from('initiatives')
                            .select('id')
                            .eq('active', true)
                            .eq('owner_id', userId)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();
                        if (initiative) hasInitiative = true;
                    }
                    console.log("AuthStore: Profile found", { role: profile.role, hasInitiative });
                    return { role: profile.role, hasInitiative };
                }

                console.warn(`AuthStore: Profile not found for ${userId}, retrying in 1.5s... (${i + 1}/${retries})`);
                await new Promise(res => setTimeout(res, 1500));
            } catch (e) {
                console.error("AuthStore: Error fetching profile", e);
                await new Promise(res => setTimeout(res, 1000));
            }
        }
        console.error("AuthStore: Failed to fetch profile after retries");
        return { role: null, hasInitiative: false };
    },

    signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;

        // Fetch role immediately after sign in
        if (data.user) {
            // We need to re-fetch/set full state to ensure hasInitiative is set correctly, 
            // but for immediate login return we might just return data.
            // Better to trigger a full initialize or just let onAuthStateChange handle it?
            // onAuthStateChange should fire.

            // However, to be safe and fast:
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .maybeSingle(); // Use maybeSingle

            let hasInitiative = false;
            if (profile?.role === 'owner') {
                const { data: initiative } = await supabase
                    .from('initiatives')
                    .select('id')
                    .eq('active', true)
                    .eq('owner_id', data.user.id)
                    .limit(1)
                    .maybeSingle();
                if (initiative) hasInitiative = true;
            }

            set({ role: profile?.role, hasInitiative });
            return { ...data, role: profile?.role, hasInitiative };
        }
        return data;
    },



    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({ session: null, user: null, role: null });
    },
}));
