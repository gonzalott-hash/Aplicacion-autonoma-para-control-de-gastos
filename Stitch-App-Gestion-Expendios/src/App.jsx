import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import OwnerSettings from './pages/OwnerSettings';
import UserExpenseRegistration from './pages/UserExpenseRegistration';
import OwnerExpenseRegistration from './pages/OwnerExpenseRegistration';

// Componente para proteger rutas
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, role, loading, initialize } = useAuthStore();
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const init = async () => {
            await initialize();
            setIsInitialized(true);
        }
        init();
    }, []);

    if (loading || !isInitialized) {
        return <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark text-primary">Cargando...</div>;
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        // Redirect based on actual role if they try to access unauthorized page
        if (role === 'owner') return <Navigate to="/owner-expense" replace />;
        if (role === 'user') return <Navigate to="/user-expense" replace />;
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />

                {/* Owner Routes */}
                <Route
                    path="/owner-settings"
                    element={
                        <ProtectedRoute allowedRoles={['owner']}>
                            <OwnerSettings />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/owner-expense"
                    element={
                        <ProtectedRoute allowedRoles={['owner']}>
                            <OwnerExpenseRegistration />
                        </ProtectedRoute>
                    }
                />

                {/* User Routes */}
                <Route
                    path="/user-expense"
                    element={
                        <ProtectedRoute allowedRoles={['user', 'owner']}> {/* Owner can also access if needed, or strict 'user' */}
                            <UserExpenseRegistration />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;
