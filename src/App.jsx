import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import {
  HistoryPage,
  HistoryRunDetailPage,
  LoginPage,
  WorkspacePage,
} from '@/pages'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'

function RootRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/' : '/login'} replace />
}

function LegacyFlowRedirect({ step }) {
  return <Navigate to={step ? `/?step=${step}` : '/'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route index element={<WorkspacePage />} />
          <Route
            path="dashboard-conversacional"
            element={<LegacyFlowRedirect step="consolidate" />}
          />
          <Route path="metabase" element={<LegacyFlowRedirect step="report" />} />
          <Route path="historial" element={<HistoryPage />} />
          <Route path="historial/:runId" element={<HistoryRunDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
