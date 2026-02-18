import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const Login = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    // Check for existing session and handle Smart Redirection
    // Check for existing session and handle Smart Redirection
    // We now rely on the authStore to have updated 'user', 'role', and 'hasInitiative'
    const { user, role, hasInitiative, loading: authLoading, initialize } = useAuthStore();

    useEffect(() => {
        // Initialize auth store if not already loaded
        initialize();
    }, []);

    useEffect(() => {
        if (!authLoading && user) {
            console.log("Login: User detected", { user: user.id, role, hasInitiative });

            if (role === 'owner') {
                const target = location.state?.from?.pathname || (hasInitiative ? '/owner-expense' : '/owner-settings');
                console.log("Login: Redirecting to", target);
                navigate(target, { replace: true });
            } else if (role === 'user') {
                console.log("Login: Redirecting to User Expense");
                navigate('/user-expense');
            } else {
                // If role is not yet loaded or invalid, we can wait or default
                // But if !authLoading and user exists, role SHOULD be there if DB is consistent.
                // Fallback:
                console.log("Login: Unknown role or no specific redirect, going to Owner Settings as fallback");
                navigate('/owner-settings');
            }
        }
    }, [user, role, hasInitiative, authLoading, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: window.location.origin, // Force redirect to current port
                },
            });

            if (error) throw error;
            setMessage('¡Enlace de acceso enviado! Revise su correo electrónico.');
        } catch (err) {
            let errorMsg = err.message || 'Error al enviar el enlace de acceso';
            if (errorMsg.includes('rate limit')) {
                errorMsg = 'Límite de envíos excedido. Use un alias (ej: sucorreo+prueba@gmail.com) o espere unos minutos.';
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-center overflow-hidden relative">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
            </div>

            <main className="relative z-10 w-full max-w-md mx-auto px-8">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-2xl mb-6">
                        <span className="material-icons-round text-primary text-5xl">account_balance_wallet</span>
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight dark:text-white mb-2">Bienvenido</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
                        Ingrese su correo para recibir un enlace de acceso seguro.
                    </p>
                </div>

                <form className="space-y-5" onSubmit={handleLogin}>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl text-center">
                            {error}
                        </div>
                    )}
                    {message && (
                        <div className="bg-green-500/10 border border-green-500/50 text-green-500 text-sm p-3 rounded-xl text-center">
                            {message}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1" htmlFor="email">
                            Correo electrónico
                        </label>
                        <div className="relative group">
                            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">mail</span>
                            <input
                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-neutral-dark border-transparent dark:border-neutral-border focus:border-primary dark:focus:border-primary focus:ring-1 focus:ring-primary rounded-xl transition-all outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                                id="email"
                                placeholder="usuario@dominio.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Enviando enlace...' : 'Recibir acceso por email'}
                    </button>


                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-neutral-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className="bg-background-light dark:bg-background-dark px-4 text-slate-500">Acceso Seguro sin Contraseña</span>
                    </div>
                </div>

                <div className="flex flex-col items-center space-y-8">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600 text-xs">
                        <span className="material-icons-round text-sm">lock</span>
                        <span>Usamos Magic Links para mayor seguridad</span>
                    </div>
                </div>
            </main>

            <footer className="mt-auto pb-8 text-center relative z-10">
                <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600 text-xs uppercase tracking-widest">
                    <span className="material-icons-round text-xs">verified_user</span>
                    <span>Sistema Encriptado AES de 256 bits</span>
                </div>
                <div className="mt-4">
                    {/* Debug button removed */}
                </div>
            </footer>
        </div>
    );
};

export default Login;
