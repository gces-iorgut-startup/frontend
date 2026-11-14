import { NavLink, useNavigate } from 'react-router-dom'
import { Home, PawPrint, Calendar, Clock, LogOut, BarChart3, BedDouble, Syringe, Receipt } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { authService } from '../../lib/authService'
import type { Role } from '../../types'
import '../../styles/layout.css'

function getNavItems(role?: Role) {
  const items = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/pacientes', label: 'Pacientes', icon: PawPrint },
    { to: '/agenda', label: 'Agenda', icon: Calendar },
    { to: '/vacinas/alertas', label: 'Alertas Vacinais', icon: Syringe },
    { to: '/historico', label: 'Histórico', icon: Clock },
    { to: '/orcamentos', label: 'Orçamentos', icon: Receipt },
    { to: '/internacao', label: 'Internação', icon: BedDouble },
  ]

  if (role === 'OWNER') {
    items.push({ to: '/dashboard', label: 'Dashboard', icon: BarChart3 })
  }

  return items
}

interface SidebarProps {
  mobileOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ mobileOpen = false, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const navItems = getNavItems(user?.role)

  const handleLogout = async () => {
    try {
      await authService.logout()
    } catch {
      // Even if API call fails, clear local state
    } finally {
      logout()
      onClose?.()
      navigate('/login')
    }
  }

  const handleOpenProfileSettings = () => {
    onClose?.()
    navigate('/configuracoes')
  }

  const displayName = user?.name || 'Rafael Rocha'
  const displayAvatar =
    user?.avatarUrl ||
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop'

  const initials = displayName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <>
      <button
        type="button"
        className={`sidebar-backdrop${mobileOpen ? ' visible' : ''}`}
        aria-label="Fechar menu lateral"
        onClick={onClose}
      />

      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <span className="sidebar-logo-text">iougurt</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              end={item.to === '/home' || item.to === '/dashboard'}
              onClick={onClose}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-user"
            onClick={handleOpenProfileSettings}
            aria-label="Abrir informações do veterinário"
          >
            <div className="sidebar-avatar">
              {displayAvatar ? <img src={displayAvatar} alt={displayName} /> : initials}
            </div>
            <span className="sidebar-username">{displayName}</span>
          </button>

          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
