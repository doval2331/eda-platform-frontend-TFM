import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ConversationDashboardPage } from './pages/ConversationDashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { MetabasePage } from './pages/MetabasePage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { useAuth } from './hooks/useAuth'

function RootRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/' : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard-conversacional" element={<ConversationDashboardPage />} />
          <Route path="metabase" element={<MetabasePage />} />
          <Route path="historial" element={<HistoryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
