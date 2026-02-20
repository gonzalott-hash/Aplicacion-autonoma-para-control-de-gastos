import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const AuthCallback = () => {
    const navigate = useNavigate();
    const { user, role, hasInitiative, initialize, loading } = useAuthStore();

    useEffect(() => {
        // Force initialization if not already done
        initialize();
    }, [initialize]);

    useEffect(() => {
        if (!loading && user) {
            console.log("AuthCallback: User verified", { user: user.id, role, hasInitiative });

            // Logic similar to Login.jsx but specific for after-auth
            if (role === 'owner') {
                const target = hasInitiative ? '/owner-expense' : '/owner-settings';
                console.log("AuthCallback: Redirecting Owner to", target);
                navigate(target, { replace: true });
            } else if (role === 'user') {
                console.log("AuthCallback: Redirecting User to Expense");
                navigate('/user-expense', { replace: true });
            } else {
                // Determine fallback if role is missing (should verify if this can happen)
                console.warn("AuthCallback: Role not found yet, redirecting to home or settings");
                navigate('/owner-settings', { replace: true });
            }
        } else if (!loading && !user) {
            // If loading finished and no user, something went wrong with the link or session
            console.error("AuthCallback: No user found after loading. Link might be invalid.");
            // Optional: Show error or redirect to login
            navigate('/', { replace: true, state: { error: 'Enlace inválido o expirado.' } });
        }
    }, [user, role, hasInitiative, loading, navigate]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-100 font-display">
            <div className="flex flex-col items-center gap-6 animate-pulse">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="material-icons-round text-primary text-3xl animate-spin">sync</span>
                </div>
                <h2 className="text-xl font-bold">Verificando credenciales...</h2>
                <p className="text-sm text-slate-500 max-w-xs text-center">
                    Estamos validando su enlace de acceso seguro. Por favor espere un momento.
                </p>
            </div>
        </div>
    );
};

export default AuthCallback;
