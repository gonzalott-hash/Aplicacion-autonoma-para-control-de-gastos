import { useState } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabaseClient'
import { PlusCircle, MinusCircle, DollarSign, Wallet, Save } from 'lucide-react'

export default function MovementForm({ onMovementAdded }) {
    const { user, currencyMode, role, expensesEnabledToday, ownerId } = useStore()
    const [type, setType] = useState('expense') // 'expense' | 'income'
    const [amount, setAmount] = useState('')
    const [currency, setCurrency] = useState('PEN') // 'PEN' | 'USD'
    const [category, setCategory] = useState('')
    const [observations, setObservations] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Determine available currencies based on config
    const showSoles = currencyMode === 'both' || currencyMode === 'soles'
    const showDollars = currencyMode === 'both' || currencyMode === 'dollars'

    // Default currency adjustment if mode changes
    if (!showSoles && currency === 'PEN' && showDollars) setCurrency('USD')
    if (!showDollars && currency === 'USD' && showSoles) setCurrency('PEN')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        // Validation
        if (!amount || parseFloat(amount) <= 0) {
            setError('El monto debe ser mayor a 0')
            setLoading(false)
            return
        }
        if (!category.trim()) {
            setError('La categoría es obligatoria')
            setLoading(false)
            return
        }

        // Role Logic: Secondary users can only add if expenses are enabled for today (unless it's an Income? Prompt implies "Activar días de gasto" covers all movements or just expenses? "habilita passwords secundarios". Assuming all access).
        if (role === 'secondary' && !expensesEnabledToday) {
            setError('El registro de movimientos no está habilitado hoy por el propietario.')
            setLoading(false)
            return
        }

        try {
            // 1. Insert Movement
            const { error: moveError } = await supabase
                .from('movements')
                .insert([
                    {
                        owner_id: role === 'owner' ? user.id : ownerId,
                        created_by: user.id,
                        type,
                        amount: parseFloat(amount),
                        currency,
                        category: category.trim(),
                        observations: observations.trim()
                    }
                ])

            if (moveError) throw moveError

            // 2. Update Balance (RPC or manual update? Security definer trigger is better, but manual for MVP speed)
            // I'll assume a Trigger handles balance updates to avoid race conditions, OR separate update.
            // Let's implement a backend trigger for balances later. For now, we will trust the UI re-fetch or Realtime.

            setSuccess('Movimiento registrado exitosamente')
            setAmount('')
            setCategory('')
            setObservations('')
            if (onMovementAdded) onMovementAdded()

            // Clear success msg after 3s
            setTimeout(() => setSuccess(''), 3000)

        } catch (err) {
            console.error(err)
            setError('Error al registrar el movimiento: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-panel p-6 mb-8 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold mb-4 text-gradient flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" />
                Registrar Movimiento
            </h3>

            {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-lg mb-4 text-sm">{error}</div>}
            {success && <div className="bg-emerald-500/20 text-emerald-200 p-3 rounded-lg mb-4 text-sm">{success}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type Toggle */}
                <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50">
                    <button
                        type="button"
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${type === 'expense'
                            ? 'bg-red-500/20 text-red-400 shadow-lg'
                            : 'text-secondary hover:text-white'
                            }`}
                        onClick={() => setType('expense')}
                    >
                        <MinusCircle className="w-4 h-4" /> Gasto
                    </button>
                    <button
                        type="button"
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${type === 'income'
                            ? 'bg-emerald-500/20 text-emerald-400 shadow-lg'
                            : 'text-secondary hover:text-white'
                            }`}
                        onClick={() => setType('income')}
                    >
                        <PlusCircle className="w-4 h-4" /> Incremento
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Amount */}
                    <div className="relative">
                        <span className="absolute left-3 top-3.5 text-secondary">
                            {currency === 'PEN' ? 'S/.' : '$'}
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="input-field pl-10 text-lg font-bold"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                        />
                    </div>

                    {/* Currency (if both active) */}
                    <div className="relative">
                        {currencyMode === 'both' ? (
                            <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700/50 h-full">
                                <button
                                    type="button"
                                    className={`flex-1 rounded-md text-sm font-bold transition-all ${currency === 'PEN' ? 'bg-indigo-500 text-white' : 'text-secondary'
                                        }`}
                                    onClick={() => setCurrency('PEN')}
                                >
                                    S/.
                                </button>
                                <button
                                    type="button"
                                    className={`flex-1 rounded-md text-sm font-bold transition-all ${currency === 'USD' ? 'bg-emerald-500 text-white' : 'text-secondary'
                                        }`}
                                    onClick={() => setCurrency('USD')}
                                >
                                    $
                                </button>
                            </div>
                        ) : (
                            <div className="input-field flex items-center justify-center bg-slate-800/50 text-secondary cursor-not-allowed">
                                {currencyMode === 'soles' ? 'Soles (S/.)' : 'Dólares ($)'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Category */}
                <div>
                    <input
                        type="text"
                        placeholder="Categoría / Concepto"
                        className="input-field"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                    />
                </div>

                {/* Observations */}
                <div>
                    <textarea
                        rows="2"
                        placeholder="Observaciones (Opcional)"
                        className="input-field resize-none"
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                    />
                </div>

                <button
                    type="submit"
                    className={`btn-primary w-full flex items-center justify-center gap-2 ${type === 'expense'
                        ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500' // Custom gradient for expense
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500' // Custom gradient for income
                        }`}
                    disabled={loading}
                    style={{ background: type === 'expense' ? undefined : undefined }} // Let CSS classes handle it, override default var
                >
                    <Save className="w-5 h-5" />
                    {loading ? 'Registrando...' : `Registrar ${type === 'expense' ? 'Gasto' : 'Incremento'}`}
                </button>
            </form>
        </div>
    )
}
