import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set, get) => ({
    user: null,
    session: null,
    role: null,
    hasInitiative: false, // New state for redirection logic
    loading: true,
    initialized: false,

    initialize: async () => {
        if (get().initialized) return;
        console.log("AuthStore: initialize called");
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            console.log("AuthStore: getSession result", { session, error: sessionError });

            let role = null;
            let hasInitiative = false;

            if (session?.user) {
                console.log("AuthStore: Fetching profile for user", session.user.id);
                try {
                    const { data: profile, error: profileError } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .maybeSingle(); // Changed to maybeSingle to avoid 406 on no rows (though profile should exist)

                    if (profileError) console.error("AuthStore: Profile error", profileError);
                    console.log("AuthStore: Profile result", profile);
                    role = profile?.role;

                    // If owner, check for initiative
                    if (role === 'owner') {
                        const { data: initiative, error: initError } = await supabase
                            .from('initiatives')
                            .select('id')
                            .eq('active', true)
                            .eq('owner_id', session.user.id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (initError) console.error("AuthStore: Initiative check error", initError);
                        if (initiative) {
                            hasInitiative = true;
                        }
                        console.log("AuthStore: Initiative check", { hasInitiative });
                    }

                } catch (e) {
                    console.error("AuthStore: Unexpected error fetching profile/initiative", e);
                }
            } else {
                console.log("AuthStore: No session found");
            }

            set({ session, user: session?.user ?? null, role, hasInitiative, loading: false, initialized: true });
            console.log("AuthStore: State updated", { user: session?.user?.id, role, hasInitiative });

            // Remove existing listener if any? (Not implemented here, but good practice usually)
            supabase.auth.onAuthStateChange(async (event, session) => {
                console.log("AuthStore: 🔔 onAuthStateChange EVENT:", event, "User:", session?.user?.id);
                let role = null;
                let hasInitiative = false;

                if (session?.user) {
                    try {
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', session.user.id)
                            .maybeSingle();
                        role = profile?.role;

                        if (role === 'owner') {
                            const { data: initiative } = await supabase
                                .from('initiatives')
                                .select('id')
                                .eq('active', true)
                                .eq('owner_id', session.user.id)
                                .limit(1)
                                .maybeSingle();
                            if (initiative) hasInitiative = true;
                        }
                    } catch (e) {
                        console.error("AuthStore: Auth change profile fetch error", e);
                    }
                }
                set({ session, user: session?.user ?? null, role, hasInitiative, loading: false, initialized: true }); // Ensure loading is false on change
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
