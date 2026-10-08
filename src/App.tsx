import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

// Landing
import { LandingPage } from './pages/LandingPage'

// Auth pages
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage'
import { FirstAccessPage } from './pages/auth/FirstAccessPage'
import { TutorLoginPage } from './pages/auth/TutorLoginPage'

// Layout
import { AppLayout } from './components/layout/AppLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { TutorPortalLayout } from './components/portal/TutorPortalLayout'

// Pages
import { HomePage } from './pages/home/HomePage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { PatientsListPage } from './pages/patients/PatientsListPage'
import { PatientRegisterPage } from './pages/patients/PatientRegisterPage'
import { PatientDetailsPage } from './pages/patients/PatientDetailsPage'
import { PatientEditPage } from './pages/patients/PatientEditPage'
import { AgendaPage } from './pages/agenda/AgendaPage'
import { ClinicalCarePage } from './pages/clinical/ClinicalCarePage'
import { HistoryListPage } from './pages/history/HistoryListPage'
import { HistoryDetailsPage } from './pages/history/HistoryDetailsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { TutorPortalHomePage } from './pages/portal/TutorPortalHomePage'
import { TutorPortalHistoryPage } from './pages/portal/TutorPortalHistoryPage'
import { TutorPortalHistoryDetailsPage } from './pages/portal/TutorPortalHistoryDetailsPage'

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  if (isAuthenticated) {
    if (user?.role === 'TUTOR') {
      return <Navigate to="/portal" replace />
    }

    return <Navigate to="/home" replace />
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />

        {/* Auth (public) */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />

        {/* Link do e-mail de convite do tutor (definição da primeira senha) */}
        <Route
          path="/primeiro-acesso"
          element={
            <PublicRoute>
              <FirstAccessPage />
            </PublicRoute>
          }
        />

        <Route
          path="/portal/login"
          element={
            <PublicRoute>
              <TutorLoginPage />
            </PublicRoute>
          }
        />

        {/* Compatibilidade com rota antiga */}
        <Route path="/tutor-portal" element={<Navigate to="/portal/login" replace />} />

        {/* Protected: OWNER + VET */}
        <Route element={<ProtectedRoute allowedRoles={['OWNER', 'VET']} />}>
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="pacientes" element={<PatientsListPage />} />
            <Route path="pacientes/cadastrar" element={<PatientRegisterPage />} />
            <Route path="pacientes/:id" element={<PatientDetailsPage />} />
            <Route path="pacientes/:id/editar" element={<PatientEditPage />} />
            <Route
              path="atendimentos/:appointmentId/pacientes/:patientId"
              element={<ClinicalCarePage />}
            />
            <Route path="agenda" element={<AgendaPage />} />
            <Route path="historico" element={<HistoryListPage />} />
            <Route path="historico/:recordId/pacientes/:patientId" element={<HistoryDetailsPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />

            <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
        </Route>

        {/* Protected: TUTOR */}
        <Route element={<ProtectedRoute allowedRoles={['TUTOR']} />}>
          <Route path="portal" element={<TutorPortalLayout />}>
            <Route index element={<TutorPortalHomePage />} />
            <Route path="historico" element={<TutorPortalHistoryPage />} />
            <Route
              path="historico/:recordId/pacientes/:patientId"
              element={<TutorPortalHistoryDetailsPage />}
            />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
