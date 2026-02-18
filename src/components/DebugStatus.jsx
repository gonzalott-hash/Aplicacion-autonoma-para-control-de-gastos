import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const DebugStatus = () => {
    const location = useLocation();
    const { user, role, loading, hasInitiative } = useAuthStore();

    // if (process.env.NODE_ENV === 'production') return null; // Force show for debug

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-black/80 text-green-400 p-4 rounded-xl border border-green-500/30 text-xs font-mono shadow-2xl backdrop-blur-md pointer-events-none">
            <h3 className="font-bold text-white mb-2 border-b border-white/20 pb-1">DEBUG STATUS v2.1</h3>
            <div className="space-y-1">
                <p><span className="text-slate-400">Ruta:</span> {location.pathname}</p>
                <p><span className="text-slate-400">Usuario:</span> {user ? user.id.slice(0, 8) + '...' : 'NULL'}</p>
                <p><span className="text-slate-400">Rol:</span> {role || 'NULL'}</p>
                <p><span className="text-slate-400">Cargando:</span> {loading ? 'SI' : 'NO'}</p>
                <p><span className="text-slate-400">Iniciativa:</span> {hasInitiative ? 'SI' : 'NO'}</p>
            </div>
        </div>
    );
};

export default DebugStatus;
