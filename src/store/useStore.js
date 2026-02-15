import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'

export const useStore = create((set, get) => ({
    user: null,
    role: null, // 'owner' | 'secondary'
    ownerId: null,
    isLoading: true,
    currencyMode: 'both', // 'both' | 'soles' | 'dollars' - fetched from config
    expensesEnabledToday: false,
    isDailyVerified: false,

    // Auth Actions
    checkSession: async () => {
        set({ isLoading: true })
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
            // Fetch user role and config
            const { data: userProfile } = await supabase
                .from('users')
                .select('role, owner_id')
                .eq('id', session.user.id)
                .single()

            const role = userProfile?.role || 'secondary'
            const ownerId = userProfile?.owner_id

            // Check daily verification status from localStorage
            const lastVerified = localStorage.getItem(`daily_verified_${session.user.id}`)
            const today = new Date().toISOString().split('T')[0]
            const isDailyVerified = lastVerified === today

            set({ user: session.user, role, ownerId, isLoading: false, isDailyVerified })

            // If owner, fetch config
            if (role === 'owner') {
                get().fetchConfig()
            } else if (ownerId) {
                // If secondary, fetch config using owner_id
                get().fetchConfigForSecondary(ownerId)
            }
        } else {
            set({ user: null, role: null, ownerId: null, isLoading: false, isDailyVerified: false })
        }
    },

    signInOwner: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error
        return data
    },

    signUpOwner: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            // Trigger will handle owner creation in public.users table
        })
        if (error) throw error
        return data
    },

    signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, role: null, ownerId: null, isDailyVerified: false })
    },

    verifyDaily: () => {
        const { user } = get()
        if (user) {
            const today = new Date().toISOString().split('T')[0]
            localStorage.setItem(`daily_verified_${user.id}`, today)
            set({ isDailyVerified: true })
        }
    },

    // Config Actions
    fetchConfig: async () => {
        const { user } = get()
        if (!user) return

        // Call RPC to get config (and trigger daily reset if needed)
        const { data: config, error } = await supabase
            .rpc('get_my_config')
            .single()

        if (config) {
            set({
                currencyMode: config.currency_mode,
                expensesEnabledToday: config.expenses_enabled_today
            })
        }
    },

    fetchConfigForSecondary: async (ownerId) => {
        const { data: config } = await supabase
            .from('app_config')
            .select('currency_mode, expenses_enabled_today')
            .eq('owner_id', ownerId)
            .single()

        if (config) {
            set({
                currencyMode: config.currency_mode,
                expensesEnabledToday: config.expenses_enabled_today
            })
        }
    }
}))
