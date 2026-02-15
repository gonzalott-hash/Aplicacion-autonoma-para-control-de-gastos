import { useStore } from '../store/useStore'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import MovementForm from '../components/MovementForm'
import { TrendingUp, TrendingDown, Edit2, ShieldAlert, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import RectificationModal from '../components/RectificationModal'

export default function Dashboard() {
    const { user, role, signOut, currencyMode } = useStore()
    const [balances, setBalances] = useState({ pen: 0, usd: 0 })
    const [movements, setMovements] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingMovement, setEditingMovement] = useState(null)

    const fetchData = async () => {
        try {
            // Fetch Balances
            const { data: balanceData } = await supabase
                .from('balances')
                .select('balance_pen, balance_usd')
                .eq('owner_id', user.id) // Assuming user.id is owner or linked. 
                .single()

            if (balanceData) {
                setBalances({ pen: balanceData.balance_pen, usd: balanceData.balance_usd })
            }

            // Fetch Recent Movements
            const { data: moves } = await supabase
                .from('movements')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10)

            if (moves) setMovements(moves)
        } catch (err) {
            console.error('Error fetching data:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()

        // Realtime subscription for updates
        const subscription = supabase
            .channel('dashboard_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'movements' }, () => {
                fetchData()
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'balances' }, () => {
                fetchData()
            })
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [user.id])

    return (
        <div className="min-h-screen p-4 md:p-8 pb-20">
            <header className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gradient">Panel de Control</h1>
                    <p className="text-secondary text-sm">
                        {role === 'owner' ? 'Propietario' : 'Usuario Secundario'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {role === 'owner' && (
                        <Link to="/config" className="p-2 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all" title="Configuración">
                            <Settings size={20} />
                        </Link>
                    )}
                    <button onClick={signOut} className="text-sm text-secondary hover:text-red-400">
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {(currencyMode === 'both' || currencyMode === 'soles') && (
                    <div className="glass-panel p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl -mr-10 -mt-10 transition-all group-hover:bg-indigo-500/20"></div>
                        <h3 className="text-secondary text-sm font-medium mb-1">Saldo en Soles</h3>
                        <p className="text-3xl font-bold">S/. {balances.pen.toFixed(2)}</p>
                    </div>
                )}

                {(currencyMode === 'both' || currencyMode === 'dollars') && (
                    <div className="glass-panel p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
                        <h3 className="text-secondary text-sm font-medium mb-1">Saldo en Dólares</h3>
                        <p className="text-3xl font-bold">$ {balances.usd.toFixed(2)}</p>
                    </div>
                )}
            </div>

            <MovementForm onMovementAdded={fetchData} />

            <div className="glass-panel overflow-hidden">
                <div className="p-4 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Últimos Movimientos</h3>
                </div>

                {movements.length === 0 ? (
                    <div className="p-8 text-center text-secondary">
                        <p>No hay movimientos recientes.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {movements.map((move) => (
                            <div key={move.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${move.type === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        {move.type === 'expense' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm md:text-base">{move.category}</p>
                                        <p className="text-xs text-secondary">
                                            {new Date(move.created_at).toLocaleString()} | {move.observations || 'Sin obs.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className={`font-bold ${move.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {move.type === 'expense' ? '-' : '+'}
                                        {move.currency === 'PEN' ? 'S/.' : '$'}
                                        {Math.abs(move.amount).toFixed(2)}
                                    </p>
                                    <div className="flex justify-end gap-2 mt-1">
                                        {/* Placeholder for Rectification - Owner or Own movements only */}
                                        {(role === 'owner' || move.created_by === user.id) && (
                                            <button
                                                onClick={() => setEditingMovement(move)}
                                                className="text-xs text-secondary hover:text-indigo-400 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
                                            >
                                                <Edit2 size={12} /> Rectificar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editingMovement && (
                <RectificationModal
                    movement={editingMovement}
                    onClose={() => setEditingMovement(null)}
                    onUpdate={() => {
                        fetchData()
                        setEditingMovement(null)
                    }}
                />
            )}
        </div>
    )
}
