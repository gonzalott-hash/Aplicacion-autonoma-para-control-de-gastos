import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Lock, Mail, UserPlus, ArrowRight } from 'lucide-react'

export default function Login() {
    const [isRegistering, setIsRegistering] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [successMessage, setSuccessMessage] = useState('')

    const navigate = useNavigate()
    const { signInOwner, signUpOwner } = useStore()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        setSuccessMessage('')

        try {
            if (isRegistering) {
                // Registration Logic
                if (password !== confirmPassword) {
                    throw new Error('Las contraseñas no coinciden')
                }
                if (password.length < 6) {
                    throw new Error('La contraseña debe tener al menos 6 caracteres')
                }

                await signUpOwner(email, password)

                // Check if auto-login happened or if email confirmation is needed
                // For this template, we assume auto-login might not happen if email confirm is on.
                // But usually supabase returns a session if email confirm is off.
                // Let's just show success and ask to login or it might auto-login if the store handles it.
                // The store doesn't auto-update user on signUp unless we call getUser or getSession.
                // Let's force a login or just show success message.

                setSuccessMessage('Cuenta creada exitosamente. Por favor inicia sesión.')
                setIsRegistering(false) // Switch back to login
                setPassword('')
                setConfirmPassword('')
            } else {
                // Login Logic
                await signInOwner(email, password)
                navigate('/')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleMode = () => {
        setIsRegistering(!isRegistering)
        setError(null)
        setSuccessMessage('')
        setPassword('')
        setConfirmPassword('')
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-8 w-full max-w-md animate-in fade-in zoom-in duration-300">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-gradient mb-2">
                        {isRegistering ? 'Crear Cuenta' : 'Bienvenido'}
                    </h2>
                    <p className="text-secondary text-sm">
                        {isRegistering
                            ? 'Registra tu control de gastos autónomo'
                            : 'Ingresa a tu panel de control'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-3 rounded-lg mb-4 text-sm animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-100 p-3 rounded-lg mb-4 text-sm animate-in slide-in-from-top-2">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-secondary w-5 h-5" />
                        <input
                            type="email"
                            placeholder="Correo electrónico"
                            className="input-field pl-10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-secondary w-5 h-5" />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            className="input-field pl-10"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {isRegistering && (
                        <div className="relative animate-in fade-in slide-in-from-top-4">
                            <Lock className="absolute left-3 top-3.5 text-secondary w-5 h-5" />
                            <input
                                type="password"
                                placeholder="Confirmar Contraseña"
                                className="input-field pl-10"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary w-full mt-6 flex items-center justify-center gap-2"
                        disabled={loading}
                    >
                        {loading
                            ? 'Procesando...'
                            : (isRegistering ? <><UserPlus size={20} /> Registrarse</> : <><ArrowRight size={20} /> Ingresar</>)
                        }
                    </button>
                </form>

                <div className="mt-6 text-center pt-6 border-t border-white/10">
                    <p className="text-sm text-secondary mb-3">
                        {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}
                    </p>
                    <button
                        onClick={toggleMode}
                        className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                    >
                        {isRegistering ? 'Iniciar Sesión' : 'Crear Cuenta Nueva'}
                    </button>
                </div>
            </div>
        </div>
    )
}
