import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const OwnerExpenseRegistration = () => {
    const navigate = useNavigate();
    const [balances, setBalances] = useState({ PEN: 0, USD: 0 });
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [currencyMode, setCurrencyMode] = useState('BOTH');
    const [initiativeName, setInitiativeName] = useState(''); // New state for name

    // Form
    const [description, setDescription] = useState('');
    const [amountPen, setAmountPen] = useState('');
    const [amountUsd, setAmountUsd] = useState('');

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [tempExpenseToEdit, setTempExpenseToEdit] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);



            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return; // Should be handled by ProtectedRoute

            // Fetch PRINCIPAL Initiative (Newest Active)
            const { data: initiativeData } = await supabase.from('initiatives')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: false }) // Get the NEWEST one
                .limit(1)
                .maybeSingle(); // Switch to maybeSingle to avoid 406 errors

            if (initiativeData && initiativeData.name) {
                setBalances({
                    PEN: parseFloat(initiativeData.budget_pen || 0),
                    USD: parseFloat(initiativeData.budget_usd || 0)
                });
                setCurrencyMode(initiativeData.currency_mode || 'BOTH');
                setInitiativeName(initiativeData.name); // Set name
            } else {
                // If no initiative exists, redirect to settings to create one
                // alert('No se encontró una cuenta activa. Redirigiendo a configuración...');
                navigate('/owner-settings');
                return;
            }

            // Expenses
            const { data: expenseData } = await supabase
                .from('expenses')
                .select(`
          *,
          profiles:user_id (full_name, email)
        `)
                .order('created_at', { ascending: false })
                .limit(10);
            setExpenses(expenseData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setDescription('');
        setAmountPen('');
        setAmountUsd('');
        setIsEditMode(false);
        setEditingExpense(null);
        setTempExpenseToEdit(null);
    };

    const handleRegisterExpense = async () => {
        const pen = parseFloat(amountPen) || 0;
        const usd = parseFloat(amountUsd) || 0;

        if (!description) return alert('Por favor agrega un concepto');

        // Validation based on Currency Mode
        if (currencyMode === 'PEN' && pen <= 0) return alert('Por favor agrega un monto en Soles');
        if (currencyMode === 'USD' && usd <= 0) return alert('Por favor agrega un monto en Dólares');
        if (currencyMode === 'BOTH' && pen === 0 && usd === 0) return alert('Por favor agrega un monto');

        setRegistering(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Sesión expirada. Por favor recarga la página.');
                return;
            }

            // Validar que exista iniciativa activa (Principal)
            const { data: initiative } = await supabase.from('initiatives')
                .select('*')
                .eq('active', true)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            if (!initiative) {
                alert('Error Crítico: No se encontró la "Cuenta Principal". Por favor ve a Ajustes para inicializarla.');
                setRegistering(false);
                return;
            }
            const targetInit = initiative;

            if (isEditMode && editingExpense) {
                // --- ACTUALIZACIÓN (Rectificación) ---

                // 1. Revertir (Sumar lo que se restó antes)
                // IMPORTANTE: parseFloat para asegurar suma numérica y no concatenación de strings
                const currentBudgetPen = parseFloat(targetInit.budget_pen || 0);
                const currentBudgetUsd = parseFloat(targetInit.budget_usd || 0);
                const oldAmount = parseFloat(editingExpense.amount || 0);

                if (editingExpense.currency === 'PEN') {
                    const { error: revError } = await supabase.from('initiatives')
                        .update({ budget_pen: currentBudgetPen - oldAmount }) // FIX: Should be adding back if we are removing the expense, but here we are rectifying.
                        // Wait, logic in previous file was:
                        // update({ budget_pen: currentBudgetPen + oldAmount })
                        // I copied my previous thought's code which had + oldAmount.
                        // Let's double check the logic.
                        // If I edit an expense of 100 PEN to be 120 PEN.
                        // 1. Revert: Budget = Budget + 100.
                        // 2. Apply New: Budget = Budget - 120.
                        // So yes, reverting means ADDING back the expense amount to the budget.
                        // In my previous step (Step 327 view_file), lines 116 said:
                        // .update({ budget_pen: currentBudgetPen + oldAmount })
                        // So it was correct.
                        // ERROR: In the code I prepared for `write_to_file` in the thought block, I might have just copy-pasted.
                        // Let me re-verify the code I am about to write.
                        .update({ budget_pen: currentBudgetPen + oldAmount })
                        .eq('id', targetInit.id);
                    if (revError) throw new Error('Error revirtiendo presupuesto (PEN): ' + revError.message);
                } else {
                    const { error: revError } = await supabase.from('initiatives')
                        .update({ budget_usd: currentBudgetUsd + oldAmount })
                        .eq('id', targetInit.id);
                    if (revError) throw new Error('Error revirtiendo presupuesto (USD): ' + revError.message);
                }

                // 2. Obtener presupuesto actualizado tras la reversión
                const { data: refreshedInit, error: refreshError } = await supabase.from('initiatives').select('*').eq('id', targetInit.id).single();
                if (refreshError || !refreshedInit) throw new Error('Error leyendo presupuesto actualizado');

                const refreshedBudgetPen = parseFloat(refreshedInit.budget_pen || 0);
                const refreshedBudgetUsd = parseFloat(refreshedInit.budget_usd || 0);

                // 3. Aplicar nuevo (Restar el nuevo monto)
                if (pen > 0) {
                    const { error: appError } = await supabase.from('initiatives')
                        .update({ budget_pen: refreshedBudgetPen - pen })
                        .eq('id', targetInit.id);
                    if (appError) throw new Error('Error aplicando nuevo presupuesto (PEN): ' + appError.message);
                } else if (usd > 0) {
                    const { error: appError } = await supabase.from('initiatives')
                        .update({ budget_usd: refreshedBudgetUsd - usd })
                        .eq('id', targetInit.id);
                    if (appError) throw new Error('Error aplicando nuevo presupuesto (USD): ' + appError.message);
                }

                // 4. Actualizar el registro del Gasto
                const { error: updateError } = await supabase.from('expenses').update({
                    description,
                    amount: pen > 0 ? pen : usd,
                    currency: pen > 0 ? 'PEN' : 'USD'
                }).eq('id', editingExpense.id);

                if (updateError) throw updateError;

                alert('Gasto rectificado y presupuesto ajustado correctamente.');

            } else {
                // --- NUEVO REGISTRO ---
                const inserts = [];
                // Only insert based on allowed currency mode
                if ((currencyMode === 'PEN' || currencyMode === 'BOTH') && pen > 0) inserts.push({
                    user_id: user.id,
                    description,
                    amount: pen,
                    currency: 'PEN',
                    category: 'general',
                    initiative_id: targetInit.id
                });
                if ((currencyMode === 'USD' || currencyMode === 'BOTH') && usd > 0) inserts.push({
                    user_id: user.id,
                    description,
                    amount: usd,
                    currency: 'USD',
                    category: 'general',
                    initiative_id: targetInit.id
                });

                const { error: insertError } = await supabase.from('expenses').insert(inserts);
                if (insertError) throw insertError;

                // Actualizar Presupuesto Iniciativa
                const currentBudgetPen = parseFloat(targetInit.budget_pen || 0);
                const currentBudgetUsd = parseFloat(targetInit.budget_usd || 0);

                if ((currencyMode === 'PEN' || currencyMode === 'BOTH') && pen > 0) {
                    const { error: budgetError } = await supabase.from('initiatives')
                        .update({ budget_pen: currentBudgetPen - pen })
                        .eq('id', targetInit.id);
                    if (budgetError) throw new Error('Error actualizando presupuesto (PEN): ' + budgetError.message);
                }
                if ((currencyMode === 'USD' || currencyMode === 'BOTH') && usd > 0) {
                    const { error: budgetError } = await supabase.from('initiatives')
                        .update({ budget_usd: currentBudgetUsd - usd })
                        .eq('id', targetInit.id);
                    if (budgetError) throw new Error('Error actualizando presupuesto (USD): ' + budgetError.message);
                }

                alert('Gasto registrado exitosamente');
            }

            resetForm();
            fetchData();

        } catch (err) {
            console.error('Error processing expense:', err);
            alert('Ha ocurrido un error: ' + err.message);
        } finally {
            setRegistering(false);
        }
    };

    const handleEditClick = (expense) => {
        setTempExpenseToEdit(expense);
        setPasswordInput('');
        setShowPasswordModal(true);
    };

    const handlePasswordVerify = async () => {
        if (passwordInput !== 'EDITAR') {
            return alert('Texto incorrecto. Escribe "EDITAR" para confirmar.');
        }

        // Confirmation OK -> Load Data for Editing
        setShowPasswordModal(false);

        const expense = tempExpenseToEdit;
        setDescription(expense.description);
        if (expense.currency === 'PEN') {
            setAmountPen(expense.amount);
            setAmountUsd('');
        } else {
            setAmountUsd(expense.amount);
            setAmountPen('');
        }

        setEditingExpense(expense);
        setIsEditMode(true);

        // Scroll to Form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen flex justify-center overflow-x-hidden font-display">

            {/* Modal de Confirmación para Editar */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="bg-[#1a2e22] border border-primary/20 p-6 rounded-2xl w-full max-w-xs shadow-2xl relative">
                        <h3 className="text-white font-bold text-lg mb-2 text-center">Confirmar Edición</h3>
                        <p className="text-slate-400 text-xs mb-4 text-center">
                            Para rectificar este gasto,<br />
                            escribe <span className="text-primary font-bold">EDITAR</span> abajo.
                        </p>
                        <input
                            type="text"
                            className="w-full bg-[#111c16] border border-primary/30 rounded-xl px-4 py-3 text-white text-sm mb-4 focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 text-center tracking-widest font-bold uppercase"
                            placeholder="EDITAR"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value.toUpperCase())}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handlePasswordVerify}
                                className="flex-1 py-3 rounded-xl bg-primary text-[#111c16] font-bold text-xs hover:opacity-90 transition shadow-lg shadow-primary/20"
                            >
                                CONFIRMAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-[430px] min-h-screen flex flex-col relative bg-background-light dark:bg-background-dark border-x border-slate-200 dark:border-primary/10 shadow-2xl">
                <header className="sticky top-0 z-50 w-full bg-background-light/80 dark:bg-background-dark/80 ios-blur border-b border-slate-200 dark:border-primary/10 px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg font-extrabold tracking-tight truncate max-w-[200px]">
                                {initiativeName || 'Registro de Gastos'}
                            </h1>
                        </div>
                        {/* Logout button removed as requested */}
                        <button
                            onClick={() => navigate('/owner-settings')}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                            title="Configuración"
                        >
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                        {/* Conditionally Show Balance Boxes based on Currency Mode */}
                        {(currencyMode === 'PEN' || currencyMode === 'BOTH') && (
                            <div className="flex-1 min-w-[140px] bg-slate-900 p-3 rounded-xl border border-slate-800">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Disponible Soles</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-white">S/ {balances.PEN.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                        {(currencyMode === 'USD' || currencyMode === 'BOTH') && (
                            <div className="flex-1 min-w-[140px] bg-slate-900 dark:bg-primary/10 p-3 rounded-xl border border-slate-800 dark:border-primary/20">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60 mb-1">Disponible Dólares</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-primary">$ {balances.USD.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 flex flex-col gap-8 px-6 pt-6 pb-12 overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-6">
                        <div>
                            <h2 className={`text-xl font-bold mb-1 ${isEditMode ? 'text-orange-500' : 'text-slate-900 dark:text-white'}`}>
                                {isEditMode ? 'Rectificar Gasto' : 'Registrar Nuevo Gasto'}
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 ml-1">Concepto</label>
                                <div className="relative">
                                    <input
                                        className="w-full h-14 px-4 rounded-xl border-none bg-slate-200/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary placeholder:text-slate-400 dark:placeholder:text-slate-600 font-medium"
                                        type="text"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        disabled={registering}
                                    />
                                </div>
                            </div>
                            <div className={`grid ${currencyMode === 'BOTH' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                                {(currencyMode === 'PEN' || currencyMode === 'BOTH') && (
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">Monto Soles (PEN)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">S/</span>
                                            <input
                                                className="w-full h-14 pl-9 pr-3 rounded-xl border-none bg-slate-200/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary placeholder:text-slate-400 dark:text-white font-bold text-lg"
                                                placeholder="0.00"
                                                type="number"
                                                step="0.01"
                                                value={amountPen}
                                                onChange={(e) => setAmountPen(e.target.value)}
                                                disabled={registering || (isEditMode && editingExpense?.currency === 'USD')}
                                            />
                                        </div>
                                    </div>
                                )}
                                {(currencyMode === 'USD' || currencyMode === 'BOTH') && (
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-primary ml-1">Monto Dólares (USD)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary/70">$</span>
                                            <input
                                                className="w-full h-14 pl-7 pr-3 rounded-xl border-none bg-slate-200/50 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary placeholder:text-slate-400 text-primary font-bold text-lg"
                                                placeholder="0.00"
                                                type="number"
                                                step="0.01"
                                                value={amountUsd}
                                                onChange={(e) => setAmountUsd(e.target.value)}
                                                disabled={registering || (isEditMode && editingExpense?.currency === 'PEN')}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botón de Acción (Movido aquí) */}
                            <button
                                onClick={handleRegisterExpense}
                                disabled={registering}
                                className={`w-full h-14 rounded-2xl font-extrabold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg mt-2 ${isEditMode
                                    ? 'bg-orange-500 text-white shadow-orange-500/20 hover:bg-orange-600'
                                    : 'bg-primary text-background-dark shadow-primary/20 hover:bg-emerald-400'
                                    } disabled:opacity-50 disabled:scale-100`}
                            >
                                <span>{registering ? (isEditMode ? 'Actualizando...' : 'Registrando...') : (isEditMode ? 'RECTIFICAR GASTO' : 'REGISTRAR GASTO')}</span>
                            </button>

                            {isEditMode && (
                                <button
                                    onClick={resetForm}
                                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-wide"
                                >
                                    Cancelar Rectificación
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-slate-200 dark:border-primary/5 pt-6">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Últimos 10 Expendios</h3>
                        </div>
                        <div className="space-y-3">
                            {expenses.map((item) => (
                                <div key={item.id} className="group flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 shadow-sm hover:border-primary/20 transition-colors">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <p className="text-sm font-bold truncate text-slate-900 dark:text-slate-200">{item.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-bold whitespace-nowrap ${item.category === 'INGRESO'
                                            ? 'text-emerald-500'
                                            : (item.currency === 'USD' ? 'text-primary' : 'text-slate-900 dark:text-white')
                                            }`}>
                                            {item.category === 'INGRESO' ? '+' : '-'}{item.currency === 'USD' ? '$' : 'S/'} {item.amount}
                                        </span>
                                        <button
                                            onClick={() => handleEditClick(item)}
                                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-orange-500 hover:bg-orange-500/10 flex items-center justify-center transition-all"
                                            title="Rectificar error"
                                        >
                                            <span className="material-symbols-outlined text-base">edit</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {expenses.length === 0 && (
                                <p className="text-center text-xs text-slate-500 py-4 opacity-50">No hay gastos recientes</p>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default OwnerExpenseRegistration;
