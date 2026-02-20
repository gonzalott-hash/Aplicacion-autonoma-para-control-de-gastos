import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import OwnerSettings from './pages/OwnerSettings';
import UserExpenseRegistration from './pages/UserExpenseRegistration';
import OwnerExpenseRegistration from './pages/OwnerExpenseRegistration';
import ErrorBoundary from './components/ErrorBoundary';
// import DebugStatus from './components/DebugStatus';
// import DebugAuth from './pages/DebugAuth';

// Componente para proteger rutas
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, role, loading, initialize, initialized } = useAuthStore();
    const location = useLocation();

    useEffect(() => {
        if (!initialized) {
            console.log("ProtectedRoute: Not initialized, calling initialize()");
            initialize();
        } else {
            console.log("ProtectedRoute: Already initialized, user:", user?.id);
        }
    }, [initialize, initialized, user]);

    console.log(`ProtectedRoute [${location.pathname}] render:`, { loading, initialized, user: user?.id, role });

    if (loading || !initialized) {
        return <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark text-primary">Cargando...</div>;
    }

    if (!user) {
        console.warn("ProtectedRoute: Redirecting to Login because NO USER. Location:", location.pathname);
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <div>Acceso Restringido</div>;
    }

    return children;
};

function App() {
    console.log("App Component Rendering...", Date.now());
    return (
        <Router>
            {/* <DebugStatus /> Removed for production */}
            <ErrorBoundary>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />

                    {/* Owner Routes */}
                    <Route
                        path="/owner-settings"
                        element={
                            <ProtectedRoute allowedRoles={['owner']}>
                                <ErrorBoundary>
                                    <OwnerSettings />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/owner-expense"
                        element={
                            <ProtectedRoute allowedRoles={['owner']}>
                                <ErrorBoundary>
                                    <OwnerExpenseRegistration />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />

                    {/* User Routes */}
                    {/* <Route path="/debug-auth" element={<DebugAuth />} /> Removed */}
                    <Route
                        path="/user-expense"
                        element={
                            <ProtectedRoute allowedRoles={['user', 'owner']}>
                                <ErrorBoundary>
                                    <UserExpenseRegistration />
                                </ErrorBoundary>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </ErrorBoundary>
        </Router>
    );
}

export default App;
