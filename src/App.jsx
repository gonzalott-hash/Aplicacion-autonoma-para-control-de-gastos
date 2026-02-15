import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import DailyValidationGate from './components/DailyValidationGate'
import Configuration from './pages/Configuration'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={
            <DailyValidationGate>
              <Dashboard />
            </DailyValidationGate>
          } />
          <Route path="/config" element={
            <DailyValidationGate>
              <Configuration />
            </DailyValidationGate>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
