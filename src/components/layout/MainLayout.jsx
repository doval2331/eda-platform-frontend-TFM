import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { IconDashboard, IconHistory, IconInsights, IconLogout } from './SidebarIcons'
import '../../styles/sidebar.css'

export function MainLayout() {
  const { user, logout } = useAuth()
  const displayName = user?.nombre?.trim() || user?.email || 'Usuario'
  const subtitle =
    user?.email && user?.nombre?.trim() ? user.email : user?.email || ''

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon" aria-hidden>
            <IconDashboard size={14} />
          </span>
          <p className="sidebar-brand-title">Plataforma EDA</p>
        </div>

        <hr className="sidebar-divider" />

        <nav className="sidebar-nav" aria-label="Navegación">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <IconInsights />
            </span>
            <span className="sidebar-link-label">Análisis exploratorio</span>
          </NavLink>
          <NavLink
            to="/historial"
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <IconHistory />
            </span>
            <span className="sidebar-link-label">Historial</span>
          </NavLink>
        </nav>

        <footer className="sidebar-footer">
          <div className="sidebar-user">
            <span className="sidebar-user-name">{displayName}</span>
            {subtitle ? <span className="sidebar-user-email">{subtitle}</span> : null}
          </div>
          <button type="button" className="sidebar-logout" onClick={logout}>
            <IconLogout />
            Salir
          </button>
        </footer>
      </aside>

      <main className="app-content">
        <div className="app-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
