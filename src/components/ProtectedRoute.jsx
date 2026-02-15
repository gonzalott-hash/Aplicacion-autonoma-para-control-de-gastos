import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ProtectedRoute() {
    const { user, isLoading, checkSession } = useStore()

    useEffect(() => {
        // Initial session check
        checkSession()

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user?.id !== user?.id) {
                checkSession()
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        )
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />
}
