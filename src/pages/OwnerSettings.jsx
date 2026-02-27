import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { fetchAndExportExpenses } from '../utils/exportUtils';
import { useAuthStore } from '../store/authStore';

const OwnerSettings = () => {
    // UI State
    const [loading, setLoading] = useState(true);
    const [isResetting, setIsResetting] = useState(false);
    const [updatingInitiative, setUpdatingInitiative] = useState(false);
    const [injectingFunds, setInjectingFunds] = useState(false);

    // Data State
    const [principalInitiativeId, setPrincipalInitiativeId] = useState(null);
    const [initiativeName, setInitiativeName] = useState('');
    const [collaboratorCount, setCollaboratorCount] = useState(0);
    const [collaboratorId, setCollaboratorId] = useState(null);

    // Forms
    const [formName, setFormName] = useState('');
    const [formBudgetPen, setFormBudgetPen] = useState('');
    const [formBudgetUsd, setFormBudgetUsd] = useState('');
    const [formCurrencyMode, setFormCurrencyMode] = useState('BOTH');

    const [injectionAmount, setInjectionAmount] = useState('');
    const [injectionCurrency, setInjectionCurrency] = useState('PEN');

    // Modals
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteMessage, setInviteMessage] = useState(null);

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [revoking, setRevoking] = useState(false);

    const navigate = useNavigate();
    const { signOut } = useAuthStore();

    useEffect(() => {
        initializePrincipalInitiative();
    }, []);

    const initializePrincipalInitiative = async () => {
        console.log("OwnerSettings: Initializing...");
        try {
            setLoading(true);

            // Safe User Check - We trust ProtectedRoute but double check
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                console.warn("OwnerSettings: No user found via getUser, trying database session...");
                // Just return, let the UI show empty or allow ProtectedRoute to handle it
                return;
            }
            const userId = user.id;
            console.log("OwnerSettings: User ID found:", userId);

            // 1. Get Principal Initiative
            const { data: initiatives, error: initError } = await supabase
                .from('initiatives')
                .select('*')
                .eq('active', true)
                .eq('owner_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);

            if (initError) throw initError;

            let pId = null;
            let currentName = '';
            let currentMode = 'BOTH';

            if (initiatives && initiatives.length > 0) {
                pId = initiatives[0].id;
                currentName = initiatives[0].name;
                currentMode = initiatives[0].currency_mode || 'BOTH';
                console.log("OwnerSettings: Active initiative found:", pId);
            } else {
                console.log("OwnerSettings: No active initiative, creating new one...");
                const { data: newInit, error: createError } = await supabase
                    .from('initiatives')
                    .insert({
                        name: 'Proyecto Nuevo',
                        budget_pen: 0,
                        budget_usd: 0,
                        currency_mode: 'BOTH',
                        icon: 'account_balance',
                        active: true,
                        owner_id: userId
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                pId = newInit.id;
                currentName = newInit.name;
                currentMode = 'BOTH'; // Default for new
                console.log("OwnerSettings: New initiative created:", pId);
            }

            setPrincipalInitiativeId(pId);
            setInitiativeName(currentName);
            setFormName('');
            setFormCurrencyMode(currentMode);

            await fetchCollaborators(pId);

        } catch (error) {
            console.error('OwnerSettings: Critical Error initializing:', error);
            alert('Error cargando ajustes: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchCollaborators = async (initId) => {
        try {
            // Get members who are NOT owner role (if roles stored in profile) or just check initiative_members
            const { data, error } = await supabase
                .from('initiative_members')
                .select('user_id, profiles(email, role)')
                .eq('initiative_id', initId);

            if (data) {
                // Filter out owner if they are in members list (depends on schema)
                // Assuming members are only added users.
                setCollaboratorCount(data.length);
                if (data.length > 0) {
                    setCollaboratorId(data[0].user_id); // Prepare for remove
                }
            }
        } catch (err) {
            console.error('Error fetching collaborators:', err);
        }
    };

    const handleUpdateInitiative = async () => {
        if (!principalInitiativeId) return;
        if (!formName.trim()) return alert('El nombre es obligatorio');

        setUpdatingInitiative(true);
        try {
            // 1. Update Name and Currency
            const { error: updateError } = await supabase
                .from('initiatives')
                .update({
                    name: formName,
                    currency_mode: formCurrencyMode
                })
                .eq('id', principalInitiativeId);

            if (updateError) throw updateError;

            // 2. Initial Budget (Only if non-zero, usually this is just for setup)
            // If the user enters amounts here, we might want to ADD them or SET them?
            // "Monto Inicial" usually means SET. But if there are expenses, setting budget might be weird.
            // Let's assume it sets the *initial* budget or adds updates.
            // Actually, based on previous logic, we use inject_funds for adding.
            // But the form says "Establecer Iniciativa" with "Monto Inicial".
            // Let's trust logic from before: update amounts directly if provided.

            const pen = parseFloat(formBudgetPen) || 0;
            const usd = parseFloat(formBudgetUsd) || 0;

            if (pen > 0 || usd > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                if (pen > 0) {
                    await supabase.rpc('inject_funds', { p_initiative_id: principalInitiativeId, p_amount: pen, p_currency: 'PEN' });
                    // Log as Income
                    await supabase.from('expenses').insert({
                        user_id: user.id,
                        description: 'Capital Inicial (Soles)',
                        amount: pen,
                        currency: 'PEN',
                        category: 'INGRESO',
                        initiative_id: principalInitiativeId
                    });
                }
                if (usd > 0) {
                    await supabase.rpc('inject_funds', { p_initiative_id: principalInitiativeId, p_amount: usd, p_currency: 'USD' });
                    // Log as Income
                    await supabase.from('expenses').insert({
                        user_id: user.id,
                        description: 'Capital Inicial (Dólares)',
                        amount: usd,
                        currency: 'USD',
                        category: 'INGRESO',
                        initiative_id: principalInitiativeId
                    });
                }
            }

            setInitiativeName(formName);
            setFormBudgetPen('');
            setFormBudgetUsd('');
            alert('¡Proyecto Actualizado Exitosamente!');

        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setUpdatingInitiative(false);
        }
    };

    const handleInjectFunds = async () => {
        const amount = parseFloat(injectionAmount);
        if (!amount || amount <= 0) return alert('Ingrese un monto válido');

        setInjectingFunds(true);
        try {
            const { error } = await supabase.rpc('inject_funds', {
                p_initiative_id: principalInitiativeId,
                p_amount: amount,
                p_currency: injectionCurrency
            });

            if (error) throw error;

            const { data: { user } } = await supabase.auth.getUser();

            // Log as Income
            await supabase.from('expenses').insert({
                user_id: user.id,
                description: 'Inyección de Fondos',
                amount: amount,
                currency: injectionCurrency,
                category: 'INGRESO',
                initiative_id: principalInitiativeId
            });

            setInjectionAmount('');
            alert('Fondos inyectados correctamente.');
            // Ideally fetch balances here, but balances are in dashboard/header. 
            // We don't show balances in settings main area anymore?
            // We can just rely on alerts.

        } catch (error) {
            console.error(error);
            // Fallback: Direct Update if RPC missing
            try {
                const { data: init } = await supabase.from('initiatives').select('*').eq('id', principalInitiativeId).single();
                let newAmount = 0;
                if (injectionCurrency === 'PEN') {
                    newAmount = (init.budget_pen || 0) + amount;
                    await supabase.from('initiatives').update({ budget_pen: newAmount }).eq('id', principalInitiativeId);
                } else {
                    newAmount = (init.budget_usd || 0) + amount;
                    await supabase.from('initiatives').update({ budget_usd: newAmount }).eq('id', principalInitiativeId);
                }
                setInjectionAmount('');
                alert('Fondos agregados (Fallback Update).');
            } catch (fallbackErr) {
                alert('Error inyectando fondos: ' + error.message);
            }
        } finally {
            setInjectingFunds(false);
        }
    };

    const requestTotalReset = () => {
        setPasswordInput('');
        setShowPasswordModal(true);
    };

    const executeTotalReset = async () => {
        // verify password first? No, verify happen in handlePasswordSubmit calling this.
        setIsResetting(true);
        try {
            // RPC
            const { data, error } = await supabase.rpc('admin_reset_initiative', {
                p_initiative_id: principalInitiativeId,
                p_new_pen: 0,
                p_new_usd: 0,
                p_delete_history: true
            });

            if (error) throw error;

            // Manual Reset Name/Mode
            const { error: nameError } = await supabase
                .from('initiatives')
                .update({ name: '', currency_mode: 'BOTH' })
                .eq('id', principalInitiativeId);

            if (nameError) throw nameError;

            // Remove all collaborators
            const { error: membersError } = await supabase
                .from('initiative_members')
                .delete()
                .eq('initiative_id', principalInitiativeId);

            if (membersError) console.error("Error deleting members during reset:", membersError);

            setInitiativeName('');
            setFormName('');
            setFormCurrencyMode('BOTH');
            setCollaboratorCount(0);
            setCollaboratorId(null);
            alert('Sistema reseteado a cero (Nombre, Balances, Historial y Colaboradores).');

        } catch (err) {
            console.error(err);
            // Fallback manual reset if RPC fails
            await supabase.from('expenses').delete().eq('initiative_id', principalInitiativeId);
            await supabase.from('initiative_members').delete().eq('initiative_id', principalInitiativeId);
            await supabase.from('initiatives').update({
                budget_pen: 0, budget_usd: 0, name: '', currency_mode: 'BOTH'
            }).eq('id', principalInitiativeId);
            setInitiativeName('');
            setFormName('');
            setFormCurrencyMode('BOTH');
            setCollaboratorCount(0);
            setCollaboratorId(null);
            alert('Sistema reseteado (Fallback Manual).');
        } finally {
            setIsResetting(false);
            setShowPasswordModal(false);
        }
    };

    const handlePasswordSubmit = async () => {
        if (passwordInput !== 'BORRAR TODO') {
            return alert('Texto de confirmación incorrecto. Escribe "BORRAR TODO".');
        }
        await executeTotalReset();
    };

    const handleExportExcel = async () => {
        if (!principalInitiativeId) return alert('No hay iniciativa activa para exportar.');
        const { success, error, count } = await fetchAndExportExpenses(principalInitiativeId);
        if (success) {
            alert(`Reporte descargado exitosamente (${count} registros).`);
        } else {
            alert('Error al exportar: ' + error);
        }
    };

    const handleInviteUser = async () => {
        setInviteMessage(null);
        if (!inviteEmail) {
            setInviteMessage({ type: 'error', text: 'Ingrese un email válido' });
            return;
        }

        setInviteLoading(true);
        try {
            // 1. Create invitation via RPC
            const { error: rpcError } = await supabase.rpc('create_invitation', {
                p_email: inviteEmail,
                p_initiative_id: principalInitiativeId
            });

            if (rpcError) throw rpcError;

            // 2. Send Magic Link
            const { error: authError } = await supabase.auth.signInWithOtp({
                email: inviteEmail,
                options: {
                    emailRedirectTo: `${window.location.origin}/`,
                },
            });

            if (authError) {
                // Posible rate limiting de Supabase (ej: límite de envíos por hora)
                if (authError.message.includes('rate limit')) {
                    throw new Error('Supabase superó el límite de correos gratis por hora. Intenta luego.');
                }
                throw authError;
            }

            setInviteMessage({ type: 'success', text: '¡Invitación enviada exitosamente!' });
            setTimeout(() => {
                setInviteEmail('');
                setInviteModalOpen(false);
                setInviteMessage(null);
            }, 2500);

        } catch (err) {
            console.error('Error invitando:', err);
            setInviteMessage({ type: 'error', text: err.message || 'Error desconocido al invitar' });
        } finally {
            setInviteLoading(false);
        }
    };

    const confirmRevokeCollaborator = () => {
        if (!collaboratorId) return;
        setShowRevokeModal(true);
    };

    const handleRevokeCollaborator = async () => {
        if (!collaboratorId) return;
        setRevoking(true);
        try {
            const { error } = await supabase
                .from('initiative_members')
                .delete()
                .eq('user_id', collaboratorId)
                .eq('initiative_id', principalInitiativeId);

            if (error) throw error;

            setCollaboratorId(null);
            setCollaboratorCount(0);
            setShowRevokeModal(false);

        } catch (err) {
            console.error(err);
            alert('Error eliminando: ' + err.message);
        } finally {
            setRevoking(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#111c16] text-primary font-display">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#111c16] text-slate-100 font-display min-h-screen flex justify-center selection:bg-primary selection:text-[#111c16]">

            {/* Confirmation Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="bg-[#1a2e22] border border-primary/20 p-6 rounded-2xl w-full max-w-xs shadow-2xl relative">
                        <h3 className="text-white font-bold text-lg mb-2 text-center">Zona de Peligro</h3>
                        <p className="text-slate-400 text-xs mb-4 text-center">
                            Esta acción es irreversible.<br />
                            Escribe <span className="text-red-500 font-bold">BORRAR TODO</span> para confirmar.
                        </p>
                        <input
                            type="text"
                            className="w-full bg-[#111c16] border border-red-500/30 rounded-xl px-4 py-3 text-white text-sm mb-4 focus:ring-2 focus:ring-red-500/50 outline-none placeholder-slate-600 text-center tracking-widest font-bold uppercase"
                            placeholder="BORRAR TODO"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handlePasswordSubmit}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-xs hover:bg-red-600 transition shadow-lg shadow-red-500/20"
                            >
                                CONFIRMAR
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Modal */}
            {inviteModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="bg-[#1a2e22] border border-primary/20 p-6 rounded-2xl w-full max-w-xs shadow-2xl relative">
                        <h3 className="text-white font-bold text-lg mb-2 text-center">Invitar Colaborador</h3>
                        <p className="text-slate-400 text-xs mb-4 text-center">Ingresa el email del usuario registrado.</p>

                        {inviteMessage && (
                            <div className={`mb-4 p-3 rounded-xl text-xs font-bold text-center ${inviteMessage.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                {inviteMessage.text}
                            </div>
                        )}

                        <input
                            type="email"
                            className="w-full bg-[#111c16] border border-primary/10 rounded-xl px-4 py-3 text-white text-sm mb-4 focus:ring-2 focus:ring-primary/50 outline-none placeholder-slate-600 center tracking-wide"
                            placeholder="usuario@email.com"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInviteUser()}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setInviteModalOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleInviteUser}
                                disabled={inviteLoading}
                                className="flex-1 py-3 rounded-xl bg-primary text-[#111c16] font-bold text-xs hover:opacity-90 transition shadow-lg shadow-primary/20"
                            >
                                {inviteLoading ? '...' : 'INVITAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-md min-h-screen bg-[#111c16] relative flex flex-col pb-32">
                <header className="sticky top-0 z-50 bg-[#111c16]/90 backdrop-blur-md px-6 pt-8 pb-4 flex justify-between items-center border-b border-primary/5">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">Configuración</h1>
                        <p className="text-sm font-bold text-primary mt-1">{initiativeName || ''}</p>
                    </div>
                    <Link
                        to="/owner-expense"
                        className="pr-6 pl-4 h-10 flex items-center justify-center bg-primary text-[#111c16] font-bold text-xs active:scale-95 transition-transform shadow-lg shadow-primary/20 hover:brightness-110"
                        style={{ clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%)' }}
                    >
                        A registro de gastos
                        <span className="material-icons-round text-sm ml-1 -mr-1">chevron_right</span>
                    </Link>
                </header>

                <main className="px-5 py-6 space-y-8 flex-1 overflow-y-auto">
                    {/* 1. Establish Initiative */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons-round text-primary text-sm">edit_note</span>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-primary/80">Preparación del proyecto</h2>
                        </div>

                        <div className="bg-[#1a2e22] rounded-2xl p-5 border border-primary/10 shadow-lg space-y-5 relative">
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/50 mb-2 pl-1">Nombre del Proyecto</label>
                                <input
                                    className="w-full bg-[#111c16] border border-primary/10 rounded-xl px-4 py-3 text-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none text-white placeholder-slate-600 font-bold"
                                    placeholder="Nombre del Proyecto"
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                />
                            </div>

                            {/* CURRENCY MODE SELECTOR */}
                            <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wide text-white/50 mb-2 pl-1">Moneda</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setFormCurrencyMode('PEN')}
                                        className={`py-3 rounded-xl text-xs font-bold border transition-all ${formCurrencyMode === 'PEN' ? 'bg-primary text-[#111c16] border-primary' : 'bg-[#111c16] text-slate-400 border-primary/10 hover:border-primary/30'}`}
                                    >
                                        SOLO SOLES
                                    </button>
                                    <button
                                        onClick={() => setFormCurrencyMode('USD')}
                                        className={`py-3 rounded-xl text-xs font-bold border transition-all ${formCurrencyMode === 'USD' ? 'bg-primary text-[#111c16] border-primary' : 'bg-[#111c16] text-slate-400 border-primary/10 hover:border-primary/30'}`}
                                    >
                                        SOLO DÓLARES
                                    </button>
                                    <button
                                        onClick={() => setFormCurrencyMode('BOTH')}
                                        className={`py-3 rounded-xl text-xs font-bold border transition-all ${formCurrencyMode === 'BOTH' ? 'bg-primary text-[#111c16] border-primary' : 'bg-[#111c16] text-slate-400 border-primary/10 hover:border-primary/30'}`}
                                    >
                                        AMBAS
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className={formCurrencyMode === 'USD' ? 'opacity-30 pointer-events-none grayscale' : ''}>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-white/50 mb-2 pl-1">Monto Inicial (Soles)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">S/.</span>
                                        <input
                                            className="w-full bg-[#111c16] border border-primary/10 rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none text-white placeholder-slate-700 font-bold"
                                            placeholder="0.00"
                                            type="number"
                                            value={formBudgetPen}
                                            onChange={(e) => setFormBudgetPen(e.target.value)}
                                            disabled={formCurrencyMode === 'USD'}
                                        />
                                    </div>
                                </div>
                                <div className={formCurrencyMode === 'PEN' ? 'opacity-30 pointer-events-none grayscale' : ''}>
                                    <label className="block text-[10px] font-bold uppercase tracking-wide text-primary/50 mb-2 pl-1">Monto Inicial (Dólares)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary/70">$</span>
                                        <input
                                            className="w-full bg-[#111c16] border border-primary/10 rounded-xl pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none text-primary placeholder-primary/30 font-bold"
                                            placeholder="0.00"
                                            type="number"
                                            value={formBudgetUsd}
                                            onChange={(e) => setFormBudgetUsd(e.target.value)}
                                            disabled={formCurrencyMode === 'PEN'}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateInitiative}
                                disabled={updatingInitiative}
                                className="w-full bg-gradient-to-r from-primary to-emerald-400 hover:opacity-90 text-[#111c16] font-black py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                            >
                                <span className="material-icons-round text-lg">{updatingInitiative ? 'hourglass_empty' : 'rocket_launch'}</span>
                                {updatingInitiative ? 'PROCESANDO...' : 'PREPARACIÓN DEL PROYECTO'}
                            </button>
                        </div>
                    </section>

                    {/* 2. Inject Funds */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons-round text-emerald-400 text-sm">payments</span>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400/80">Inyectar Dinero Fresco</h2>
                        </div>
                        <div className="bg-[#1a2e22] rounded-2xl p-5 border border-primary/10 shadow-lg space-y-4">
                            <div className="grid grid-cols-[1fr,1.5fr] gap-3">
                                <div className="relative">
                                    <select
                                        value={injectionCurrency}
                                        onChange={(e) => setInjectionCurrency(e.target.value)}
                                        className="w-full bg-[#111c16] border border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 text-white appearance-none h-full font-bold"
                                    >
                                        <option value="PEN">Soles (S/.)</option>
                                        <option value="USD">Dólares ($)</option>
                                    </select>
                                    <span className="material-icons-round absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-sm">expand_more</span>
                                </div>
                                <input
                                    className="w-full bg-[#111c16] border border-primary/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/50 text-white placeholder-slate-600 font-bold"
                                    placeholder="0.00"
                                    type="number"
                                    value={injectionAmount}
                                    onChange={(e) => setInjectionAmount(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleInjectFunds}
                                disabled={injectingFunds}
                                className="w-full bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 font-bold py-3 rounded-xl hover:bg-emerald-500 hover:text-[#111c16] transition-all disabled:opacity-50 flex flex-col items-center justify-center gap-0.5"
                            >
                                <span>{injectingFunds ? 'PROCESANDO...' : 'AGREGAR FONDOS'}</span>
                                <span className="text-[10px] font-normal opacity-70">AL MONTO INICIAL</span>
                            </button>
                        </div>
                    </section>

                    {/* 3. Collaborators */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons-round text-slate-400 text-sm">group</span>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400/80">Colaboradores</h2>
                        </div>

                        {collaboratorCount === 0 ? (
                            <button
                                onClick={() => setInviteModalOpen(true)}
                                className="w-full bg-[#1a2e22] rounded-2xl p-5 border border-primary/10 shadow-lg flex items-center justify-between group hover:border-primary/30 transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#111c16] flex items-center justify-center text-primary border border-primary/10">
                                        <span className="material-icons-round">person_add</span>
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">Asignar Colaborador</h3>
                                        <p className="text-[10px] text-slate-500">1 cupo disponible</p>
                                    </div>
                                </div>
                                <span className="material-icons-round text-slate-500 group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                        ) : (
                            <div className="bg-[#1a2e22] rounded-2xl p-5 border border-emerald-500/20 shadow-lg flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/10">
                                        <span className="material-icons-round">check</span>
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-sm font-bold text-emerald-400">Cupo Ocupado</h3>
                                        <p className="text-[10px] text-slate-500">Ya existe 1 colaborador asignado.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={confirmRevokeCollaborator}
                                    className="text-[10px] font-bold text-red-400 hover:text-red-500 hover:underline"
                                >
                                    REVOCAR
                                </button>
                            </div>
                        )}
                    </section>

                    {/* 4. Data & Reportes */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="material-icons-round text-blue-400 text-sm">table_view</span>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-400/80">Data & Reportes</h2>
                        </div>
                        <button
                            onClick={handleExportExcel}
                            className="w-full bg-[#1a2e22] rounded-2xl p-5 border border-primary/10 shadow-lg flex items-center justify-between group hover:border-blue-400/30 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
                                    <span className="material-icons-round">download</span>
                                </div>
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Descargar Reporte Excel</h3>
                                    <p className="text-[10px] text-slate-500">Historial completo de gastos registrados</p>
                                </div>
                            </div>
                            <span className="material-icons-round text-slate-500 group-hover:translate-x-1 transition-transform">chevron_right</span>
                        </button>
                    </section>

                    {/* 5. Danger Zone */}
                    <section className="mt-8 border-t border-red-500/20 pt-8 opacity-80 hover:opacity-100 transition-opacity">
                        <button
                            onClick={requestTotalReset}
                            disabled={isResetting}
                            className="w-full flex items-center justify-center gap-2 text-red-500/70 hover:text-red-500 font-bold text-xs py-3 rounded-xl hover:bg-red-500/10 transition-all mb-4"
                        >
                            <span className="material-icons-round text-sm">delete_forever</span>
                            {isResetting ? 'BORRANDO...' : 'RESETEO TOTAL DE FÁBRICA'}
                        </button>
                    </section>

                    {/* 6. Logout */}
                    <section className="border-t border-slate-700/50 pt-8 opacity-80 hover:opacity-100 transition-opacity">
                        <button
                            onClick={async () => {
                                await signOut();
                                navigate('/');
                            }}
                            className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white font-bold text-xs py-3 rounded-xl hover:bg-slate-800 transition-all border border-slate-800"
                        >
                            <span className="material-icons-round text-sm">logout</span>
                            CERRAR SESIÓN
                        </button>
                    </section>

                </main>
            </div>

            {/* Modal de Revocar Colaborador */}
            {showRevokeModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                    <div className="bg-[#1a2e22] border border-orange-500/20 p-6 rounded-2xl w-full max-w-xs shadow-2xl relative">
                        <h3 className="text-white font-bold text-lg mb-2 text-center text-orange-400">Revocar Acceso</h3>
                        <p className="text-slate-400 text-xs mb-4 text-center">
                            El colaborador dejará de tener acceso a los fondos inmediatamente.
                        </p>
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => setShowRevokeModal(false)}
                                className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                            >
                                CANCELAR
                            </button>
                            <button
                                onClick={handleRevokeCollaborator}
                                disabled={revoking}
                                className="flex-1 py-3 rounded-xl bg-orange-500/10 border border-orange-500/50 text-orange-400 font-bold text-xs hover:bg-orange-500 hover:text-white transition disabled:opacity-50"
                            >
                                {revoking ? 'REVOCANDO...' : 'REVOCAR'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerSettings;
