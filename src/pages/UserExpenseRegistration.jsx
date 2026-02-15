import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

const UserExpenseRegistration = () => {
    const [balances, setBalances] = useState({ PEN: 0, USD: 0 });
    const [myExpenses, setMyExpenses] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form
    const [concept, setConcept] = useState('');
    const [amountPen, setAmountPen] = useState('');
    const [amountUsd, setAmountUsd] = useState('');

    const navigate = useNavigate();
    const user = useAuthStore(state => state.user);

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        try {
            // Balances (Read Only for User)
            const { data: balanceData } = await supabase.from('balances').select('*');
            const newBalances = { PEN: 0, USD: 0 };
            balanceData?.forEach(b => {
                if (b.currency === 'PEN') newBalances.PEN = b.amount;
                if (b.currency === 'USD') newBalances.USD = b.amount;
            });
            setBalances(newBalances);

            // My Expenses
            const { data: expenseData } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', user?.id) // RLS handles this too, but good to be explicit
                .order('created_at', { ascending: false })
                .limit(5);
            setMyExpenses(expenseData || []);
        } catch (error) {
            console.error('Error fetching data', error);
        }
    };

    const handleRegister = async () => {
        const pen = parseFloat(amountPen) || 0;
        const usd = parseFloat(amountUsd) || 0;

        if (!concept || (pen === 0 && usd === 0)) return;

        setLoading(true);
        try {
            // Fetch Active Initiative to link expense
            const { data: initiatives } = await supabase.from('initiatives').select('id').eq('active', true).limit(1);
            const activeInitiativeId = initiatives && initiatives.length > 0 ? initiatives[0].id : null;

            if (!activeInitiativeId) {
                alert('No hay iniciativa activa para registrar gastos. Contacte al administrador.');
                setLoading(false);
                return;
            }

            // Insert Expense(s)
            const inserts = [];
            if (pen > 0) {
                inserts.push({
                    user_id: user.id,
                    description: concept,
                    amount: pen,
                    currency: 'PEN',
                    category: 'general',
                    initiative_id: activeInitiativeId // FIX: Link to initiative
                });
            }
            if (usd > 0) {
                inserts.push({
                    user_id: user.id,
                    description: concept,
                    amount: usd,
                    currency: 'USD',
                    category: 'general',
                    initiative_id: activeInitiativeId // FIX: Link to initiative
                });
            }

            const { error } = await supabase.from('expenses').insert(inserts);
            if (error) throw error;

            // Trigger Balance Update (Simulated for client-side speed, real apps use Triggers/Functions)
            if (pen > 0) {
                await supabase.from('balances').update({ amount: balances.PEN - pen }).eq('currency', 'PEN');
            }
            if (usd > 0) {
                await supabase.from('balances').update({ amount: balances.USD - usd }).eq('currency', 'USD');
            }

            setConcept('');
            setAmountPen('');
            setAmountUsd('');
            fetchData();
            alert('Gasto registrado correctamente');

        } catch (error) {
            console.error('Error registering expense', error);
            alert('Hubo un error al registrar el gasto');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    // Helper for formatting time
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex justify-center font-display">
            <div className="w-full max-w-md min-h-screen bg-background-light dark:bg-background-dark relative flex flex-col">
                <header className="px-6 pt-8 pb-2 flex justify-between items-center ios-safe-top">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Registro de Gastos</h1>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest opacity-80">Usuario Limitado</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#1a2e22] flex items-center justify-center border border-primary/20 cursor-pointer" onClick={handleLogout} title="Cerrar Sesión">
                        <span className="material-icons-round text-gray-400 hover:text-white transition-colors">logout</span>
                    </div>
                </header>

                <div className="px-6 py-4">
                    <div className="bg-gradient-to-br from-[#1a2e22] to-[#243a2d] rounded-2xl p-5 border border-primary/10 shadow-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 text-center">Saldos Disponibles (Vista)</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="border-r border-slate-700/50 pr-2 text-center">
                                <p className="text-[10px] font-medium text-slate-500 mb-0.5 uppercase">Soles (PEN)</p>
                                <p className="text-xl font-bold text-white leading-tight">S/ {balances.PEN.toFixed(2)}</p>
                            </div>
                            <div className="pl-2 text-center">
                                <p className="text-[10px] font-medium text-slate-500 mb-0.5 uppercase">Dólares (USD)</p>
                                <p className="text-xl font-bold text-primary leading-tight">$ {balances.USD.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="flex-1 px-6 pt-2 pb-32">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Concepto de gasto</label>
                            <div className="relative group">
                                <input
                                    className="w-full bg-white dark:bg-[#1a2e22] border-0 rounded-xl px-4 py-4 text-base focus:ring-2 focus:ring-primary transition-all duration-200 placeholder:text-slate-500 shadow-sm"
                                    placeholder="Ej. Materiales de oficina"
                                    type="text"
                                    value={concept}
                                    onChange={(e) => setConcept(e.target.value)}
                                />
                                <span className="material-icons-round absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">edit_note</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#1a2e22] rounded-2xl overflow-hidden border border-slate-200 dark:border-primary/10 shadow-sm">
                            <div className="grid grid-cols-2">
                                <div className="p-4 border-r border-slate-200 dark:border-slate-700/50">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 text-center">Soles (S/)</label>
                                    <input
                                        className="w-full bg-transparent border-0 p-0 text-center text-2xl font-bold text-slate-900 dark:text-white focus:ring-0 placeholder:text-slate-300 dark:placeholder:text-slate-700"
                                        placeholder="0.00"
                                        type="number"
                                        step="0.01"
                                        value={amountPen}
                                        onChange={(e) => setAmountPen(e.target.value)}
                                    />
                                </div>
                                <div className="p-4">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 text-center">Dólares ($)</label>
                                    <input
                                        className="w-full bg-transparent border-0 p-0 text-center text-2xl font-bold text-primary focus:ring-0 placeholder:text-primary/20"
                                        placeholder="0.00"
                                        type="number"
                                        step="0.01"
                                        value={amountUsd}
                                        onChange={(e) => setAmountUsd(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-background-dark font-bold py-4 rounded-xl text-lg shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <span className="material-icons-round">add_task</span>
                            {loading ? 'Registrando...' : 'Registrar Gasto'}
                        </button>
                    </div>

                    <section className="mt-10 mb-10">
                        <div className="flex justify-between items-end mb-4 px-1">
                            <h2 className="text-lg font-bold">Mis Entradas Recientes</h2>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Últimos movimientos</span>
                        </div>

                        <div className="space-y-3">
                            {myExpenses.map((item) => (
                                <div key={item.id} className="bg-white dark:bg-[#1a2e22]/50 p-4 rounded-xl flex items-center justify-between border border-transparent dark:border-primary/5 hover:border-primary/20 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                            <span className="material-icons-round text-xl">receipt_long</span>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-sm">{item.description}</h3>
                                            <p className="text-[10px] text-slate-500 uppercase font-medium">{formatTime(item.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className={`font-bold text-sm ${item.currency === 'USD' ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                                {item.currency === 'USD' ? '$' : 'S/'} {item.amount}
                                            </p>
                                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">{item.currency}</p>
                                        </div>
                                        {/* Edit button placeholder - logic not implemented yet */}
                                        <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#243a2d] flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
                                            <span className="material-icons-round text-sm">edit</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {myExpenses.length === 0 && (
                                <p className="text-center text-xs text-slate-500 py-4">No has registrado gastos aún.</p>
                            )}
                        </div>

                        <div className="mt-6 flex justify-center">
                            <button className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                                Ver más registros
                                <span className="material-icons-round text-sm">expand_more</span>
                            </button>
                        </div>
                    </section>
                </main>

                <nav className="h-20 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-t border-primary/10 px-10 flex justify-between items-center fixed bottom-0 w-full max-w-md">
                    <div className="flex flex-col items-center gap-1 text-primary">
                        <span className="material-icons-round">add_circle</span>
                        <span className="text-[9px] font-bold uppercase tracking-tight">Registrar</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-slate-500">
                        <span className="material-icons-round">history</span>
                        <span className="text-[9px] font-bold uppercase tracking-tight">Historial</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 text-slate-500">
                        <span className="material-icons-round">settings</span>
                        <span className="text-[9px] font-bold uppercase tracking-tight">Ajustes</span>
                    </div>
                </nav>

                <div className="h-1 w-32 bg-slate-400/20 rounded-full mx-auto fixed bottom-2 left-1/2 -translate-x-1/2 pointer-events-none"></div>
            </div>
        </div>
    );
};

export default UserExpenseRegistration;
