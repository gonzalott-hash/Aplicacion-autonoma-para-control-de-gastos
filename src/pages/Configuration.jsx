import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabaseClient'
import { Settings, DollarSign, Users, CalendarCheck, Shield, ChevronLeft, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useExcelExport } from '../hooks/useExcelExport'
import SecondaryUserManager from '../components/SecondaryUserManager'

export default function Configuration() {
    const { user, role, fetchConfig, expensesEnabledToday, currencyMode } = useStore()
    const { exportToExcel } = useExcelExport()
    const [loading, setLoading] = useState(false)

    // Local state for toggles preventing stutter
    const [config, setConfig] = useState({
        currency_mode: currencyMode,
        expenses_enabled_today: expensesEnabledToday
    })

    useEffect(() => {
        setConfig({
            currency_mode: currencyMode,
            expenses_enabled_today: expensesEnabledToday
        })
    }, [currencyMode, expensesEnabledToday])

    if (role !== 'owner') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="glass-panel p-8 text-center text-red-300">
                    <ShieldAlert className="w-12 h-12 mx-auto mb-4" />
                    <h2 className="text-xl font-bold">Acceso Denegado</h2>
                    <p>Solo el propietario puede acceder a la configuración.</p>
                    <Link to="/" className="btn-primary mt-4 inline-block">Volver al Inicio</Link>
                </div>
            </div>
        )
    }

    const updateConfig = async (key, value) => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from('app_config')
                .update({ [key]: value })
                .eq('owner_id', user.id)

            if (error) throw error

            // Optimistic / Store update
            await fetchConfig()
        } catch (err) {
            console.error(err)
            alert('Error actualizando configuración')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-8 pb-20">
            <header className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <Link to="/" className="text-secondary hover:text-white p-2 bg-white/5 rounded-full">
                        <ChevronLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
                            <Settings className="w-6 h-6" /> Configuración
                        </h1>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">

                {/* Moneda */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-indigo-400" /> Monedas Activas
                    </h3>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => updateConfig('currency_mode', 'both')}
                            className={`p-4 rounded-xl border transition-all text-left ${config.currency_mode === 'both' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-transparent border-white/10 text-secondary hover:bg-white/5'}`}
                        >
                            <span className="font-bold block">Ambas (Soles y Dólares)</span>
                            <span className="text-xs opacity-70">Sistema dual activo</span>
                        </button>
                        <button
                            onClick={() => updateConfig('currency_mode', 'soles')}
                            className={`p-4 rounded-xl border transition-all text-left ${config.currency_mode === 'soles' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-transparent border-white/10 text-secondary hover:bg-white/5'}`}
                        >
                            <span className="font-bold block">Solo Soles (S/.)</span>
                        </button>
                        <button
                            onClick={() => updateConfig('currency_mode', 'dollars')}
                            className={`p-4 rounded-xl border transition-all text-left ${config.currency_mode === 'dollars' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'bg-transparent border-white/10 text-secondary hover:bg-white/5'}`}
                        >
                            <span className="font-bold block">Solo Dólares ($)</span>
                        </button>
                    </div>
                </div>

                {/* Activación Diaria */}
                <div className="glass-panel p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-emerald-400" /> Control Diario
                    </h3>
                    <div className="mb-4">
                        <label className="flex items-center justify-between cursor-pointer p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                            <div>
                                <span className="font-bold block">Permitir Gastos Hoy</span>
                                <span className="text-xs text-secondary">Habilita a usuarios secundarios</span>
                            </div>
                            <div className={`w-12 h-6 rounded-full relative transition-colors ${config.expenses_enabled_today ? 'bg-emerald-500' : 'bg-slate-600'}`} onClick={() => updateConfig('expenses_enabled_today', !config.expenses_enabled_today)}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${config.expenses_enabled_today ? 'left-7' : 'left-1'}`}></div>
                            </div>
                        </label>
                    </div>
                    <p className="text-xs text-secondary bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                        <Shield className="w-3 h-3 inline mr-1" />
                        Esta configuración se reinicia automáticamente cada medianoche.
                    </p>
                </div>

                {/* Gestión de Usuarios */}
                <SecondaryUserManager />

                {/* Descarga de Excel */}
                <div className="glass-panel p-6 md:col-span-2 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Download className="w-5 h-5 text-sky-400" /> Copia de Seguridad
                        </h3>
                        <p className="text-sm text-secondary">Descarga todos los movimientos en formato Excel.</p>
                    </div>
                    <button
                        onClick={() => exportToExcel(user.id)}
                        className="bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
                        disabled={loading}
                    >
                        <Download size={20} /> Descargar
                    </button>
                </div>

            </div>
        </div>
    )
}
