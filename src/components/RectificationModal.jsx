import { useState } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabaseClient'
import { X, Save, Trash2, Lock, AlertTriangle } from 'lucide-react'

export default function RectificationModal({ movement, onClose, onUpdate }) {
    const { user, role } = useStore()
    const [password, setPassword] = useState('')
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Edit Form State
    const [amount, setAmount] = useState(movement.amount)
    const [type, setType] = useState(movement.type)
    const [category, setCategory] = useState(movement.category)
    const [observations, setObservations] = useState(movement.observations || '')
    const [currency, setCurrency] = useState(movement.currency)

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            if (role === 'owner') {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: password
                })
                if (signInError) throw new Error('Contraseña incorrecta')
                setIsAuthenticated(true)
            } else {
                // RPC check for secondary
                const { data, error: rpcError } = await supabase
                    .rpc('verify_secondary_password', { input_password: password })

                if (rpcError) throw rpcError
                if (data) {
                    setIsAuthenticated(true)
                } else {
                    throw new Error('Contraseña incorrecta')
                }
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('movements')
                .update({
                    amount: parseFloat(amount),
                    type,
                    category,
                    observations,
                    currency,
                    // trigger will handle balance update automatically
                })
                .eq('id', movement.id)

            if (error) throw error
            onUpdate()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!window.confirm('¿Estás seguro de eliminar este movimiento permanentemente?')) return

        setLoading(true)
        try {
            const { error } = await supabase
                .from('movements')
                .delete()
                .eq('id', movement.id)

            if (error) throw error
            onUpdate()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-md relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-secondary hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    {isAuthenticated ? <Edit2 className="w-5 h-5 text-indigo-400" /> : <Lock className="w-5 h-5 text-indigo-400" />}
                    {isAuthenticated ? 'Rectificar Movimiento' : 'Validación Requerida'}
                </h2>

                {!isAuthenticated ? (
                    <form onSubmit={handleAuth}>
                        <p className="text-secondary mb-4 text-sm">
                            Para rectificar este movimiento, debes ingresar tu contraseña {role === 'owner' ? 'maestra' : 'secundaria'}.
                        </p>

                        {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                        <div className="relative mb-6">
                            <Lock className="absolute left-3 top-3.5 text-secondary w-5 h-5" />
                            <input
                                type="password"
                                placeholder="Contraseña"
                                className="input-field pl-10"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <button type="submit" className="btn-primary w-full" disabled={loading}>
                            {loading ? 'Validando...' : 'Validar'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-secondary mb-1 block">Tipo</label>
                                <select
                                    className="input-field"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="expense">Gasto</option>
                                    <option value="income">Incremento</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-secondary mb-1 block">Moneda</label>
                                <select
                                    className="input-field"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                >
                                    <option value="PEN">Soles (S/.)</option>
                                    <option value="USD">Dólares ($)</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-secondary mb-1 block">Monto</label>
                            <input
                                type="number"
                                step="0.01"
                                className="input-field font-bold"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-secondary mb-1 block">Categoría</label>
                            <input
                                type="text"
                                className="input-field"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-secondary mb-1 block">Observaciones</label>
                            <textarea
                                rows="2"
                                className="input-field resize-none"
                                value={observations}
                                onChange={(e) => setObservations(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleDelete}
                                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                            <button
                                onClick={handleUpdate}
                                className="flex-[2] btn-primary flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                <Save className="w-4 h-4" /> Guardar Cambios
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
