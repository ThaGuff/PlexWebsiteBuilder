import { Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { useAuthStore } from './store/auth'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import BuildPage from './pages/BuildPage'
import BuildStatusPage from './pages/BuildStatusPage'
import HistoryPage from './pages/HistoryPage'
import SitesPage from './pages/SitesPage'
import SettingsPage from './pages/SettingsPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/build" element={<BuildPage />} />
        <Route path="/builds/:id" element={<BuildStatusPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/sites" element={<SitesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
