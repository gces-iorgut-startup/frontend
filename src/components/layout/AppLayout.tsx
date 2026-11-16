import { useEffect, useMemo, useState } from 'react'
import { Menu } from 'lucide-react'
import { Outlet, matchPath, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AppLayout() {
  const location = useLocation()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const showMobileMenuButton = useMemo(
    () =>
      [
        '/home',
        '/dashboard',
        '/pacientes',
        '/agenda',
        '/vacinas/alertas',
        '/orcamentos',
        '/historico',
        '/configuracoes',
        '/historico/:recordId/pacientes/:patientId',
        '/atendimentos/:appointmentId/pacientes/:patientId',
        '/pacientes/:id',
      ].some((pattern) => matchPath(pattern, location.pathname)),
    [location.pathname],
  )

  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)')
    const handler = () => {
      if (mq.matches) setMobileSidebarOpen(false)
    }

    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <div className={`layout${showMobileMenuButton ? ' mobile-menu-enabled' : ''}`}>
      {showMobileMenuButton ? (
        <button
          type="button"
          className="mobile-sidebar-toggle"
          aria-label="Abrir menu lateral"
          aria-expanded={mobileSidebarOpen}
          onClick={() => setMobileSidebarOpen(true)}
        >
          <Menu size={28} />
        </button>
      ) : null}

      <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
