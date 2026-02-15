import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const signIn = useAuthStore((state) => state.signIn);
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [isRegistering, setIsRegistering] = useState(false); // Toggle state

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isRegistering) {
                // Registration Logic
                const { data, error } = await import('../lib/supabase').then(m => m.supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                }));

                if (error) throw error;

                alert('Registro exitoso. Por favor inicie sesión.');
                setIsRegistering(false); // Switch back to login
            } else {
                // Login Logic
                const { role } = await signIn(email, password);

                if (role === 'owner') {
                    navigate('/owner-settings');
                } else if (role === 'user') {
                    navigate('/user-expense');
                } else {
                    navigate('/user-expense');
                }
            }
        } catch (err) {
            setError(err.message || 'Error en autenticación');
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
                        Acceda de forma segura a sus carteras multimoneda y controles de presupuesto.
                    </p>
                </div>

                <form className="space-y-5" onSubmit={handleLogin}>
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl text-center">
                            {error}
                        </div>
                    )}

                    {/* Toggle Login/Register */}
                    <div className="flex bg-slate-100 dark:bg-neutral-dark p-1 rounded-xl mb-6">
                        <button
                            type="button"
                            onClick={() => setIsRegistering(false)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${!isRegistering ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Ingresar
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsRegistering(true)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${isRegistering ? 'bg-white dark:bg-slate-700 shadow text-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            Registrarse
                        </button>
                    </div>

                    {isRegistering && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1" htmlFor="fullName">
                                Nombre Completo
                            </label>
                            <div className="relative group">
                                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">badge</span>
                                <input
                                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-neutral-dark border-transparent dark:border-neutral-border focus:border-primary dark:focus:border-primary focus:ring-1 focus:ring-primary rounded-xl transition-all outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                                    id="fullName"
                                    placeholder="Tu nombre"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required={isRegistering}
                                />
                            </div>
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

                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400" htmlFor="password">
                                Contraseña
                            </label>
                            {!isRegistering && <a className="text-xs font-medium text-primary hover:text-primary/80" href="#">¿Olvidó su clave?</a>}
                        </div>
                        <div className="relative group">
                            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                            <input
                                className="w-full pl-12 pr-12 py-4 bg-white dark:bg-neutral-dark border-transparent dark:border-neutral-border focus:border-primary dark:focus:border-primary focus:ring-1 focus:ring-primary rounded-xl transition-all outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                                id="password"
                                placeholder="••••••••"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 outline-none"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                <span className="material-icons-round text-xl">{showPassword ? 'visibility' : 'visibility_off'}</span>
                            </button>
                        </div>
                    </div>

                    <button
                        className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta' : 'Iniciar sesión')}
                    </button>
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-neutral-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-widest">
                        <span className="bg-background-light dark:bg-background-dark px-4 text-slate-500">Acceso Seguro</span>
                    </div>
                </div>

                <div className="flex flex-col items-center space-y-8">
                    <button className="flex items-center justify-center w-14 h-14 rounded-full bg-slate-200 dark:bg-neutral-dark border border-slate-300 dark:border-neutral-border text-slate-600 dark:text-slate-300 hover:border-primary transition-colors" type="button">
                        <span className="material-icons-round text-3xl">fingerprint</span>
                    </button>

                </div>
            </main>

            <footer className="mt-auto pb-8 text-center relative z-10">
                <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600 text-xs uppercase tracking-widest">
                    <span className="material-icons-round text-xs">verified_user</span>
                    <span>Sistema Encriptado AES de 256 bits</span>
                </div>
            </footer>

            <div className="fixed top-6 right-6 flex items-center gap-2 bg-neutral-dark border border-neutral-border rounded-full py-1.5 px-3 z-20">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">Sistema Listo</span>
            </div>
        </div>
    );
};

export default Login;
