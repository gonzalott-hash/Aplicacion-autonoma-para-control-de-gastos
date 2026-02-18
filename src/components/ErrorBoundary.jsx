import React from 'react';
import { Link } from 'react-router-dom';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 font-display text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-lg shadow-red-500/10 animate-pulse">
                        <span className="material-icons-round text-red-500 text-4xl">bug_report</span>
                    </div>

                    <h1 className="text-3xl font-black text-red-400 mb-2 tracking-tight">¡Algo salió mal!</h1>
                    <p className="text-slate-400 mb-8 max-w-md text-sm">
                        La aplicación ha encontrado un error inesperado al intentar mostrar esta pantalla.
                    </p>

                    <div className="w-full max-w-2xl bg-[#0a110e] rounded-xl border border-red-500/20 p-6 overscroll-auto mb-8 shadow-inner text-left">
                        <h3 className="text-red-400 font-mono text-xs font-bold mb-2 uppercase tracking-widest border-b border-red-500/10 pb-2">Detalle del Error:</h3>
                        <pre className="text-red-300 font-mono text-xs whitespace-pre-wrap break-words overflow-auto max-h-60 custom-scrollbar">
                            {this.state.error && this.state.error.toString()}
                        </pre>
                        {this.state.errorInfo && (
                            <>
                                <h3 className="text-slate-500 font-mono text-xs font-bold mt-4 mb-2 uppercase tracking-widest border-b border-slate-700/50 pb-2">Stack Trace:</h3>
                                <details className="cursor-pointer group">
                                    <summary className="text-slate-400 text-xs hover:text-white transition-colors list-none flex items-center gap-2">
                                        <span className="material-icons-round text-sm group-open:rotate-90 transition-transform">chevron_right</span>
                                        Ver detalles técnicos
                                    </summary>
                                    <pre className="text-slate-500 font-mono text-[10px] whitespace-pre-wrap break-words overflow-auto max-h-40 mt-2 pl-4 border-l-2 border-slate-800">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            </>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => window.location.reload()}
                            className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center gap-2"
                        >
                            <span className="material-icons-round">refresh</span>
                            RECARGAR PÁGINA
                        </button>
                        <Link
                            to="/"
                            className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-white/10 active:scale-95 flex items-center gap-2"
                        >
                            <span className="material-icons-round">home</span>
                            IR AL INICIO
                        </Link>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
