import { useState } from 'react'
import { NavLink, Outlet, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { IconChevron, IconDashboard, IconHistory, IconInsights, IconLogout } from './SidebarIcons'
import '@/styles/sidebar.css'

const SIDEBAR_KEY = 'eda-sidebar-collapsed'

function readSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== '0'
  } catch {
    return true
  }
}

export function MainLayout() {
  const { user, logout } = useAuth()
  const [searchParams] = useSearchParams()
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed)
  const workspaceStep = searchParams.get('step') ?? 'analyze'
  const displayName = user?.nombre?.trim() || user?.email || 'Usuario'
  const subtitle =
    user?.email && user?.nombre?.trim() ? user.email : user?.email || ''

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        // El menú sigue pudiendo abrirse en esta sesión.
      }
      return next
    })
  }

  return (
    <div className="app-shell">
      <aside className={`app-sidebar${collapsed ? ' app-sidebar--collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon" aria-hidden>
            <IconDashboard size={14} />
          </span>
          <div className="sidebar-brand-text">
            <p className="sidebar-brand-title">Plataforma EDA</p>
            <p className="sidebar-brand-subtitle">{displayName}</p>
            {subtitle ? <p className="sidebar-brand-email">{subtitle}</p> : null}
          </div>
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Abrir menú' : 'Cerrar menú'}
        >
          <IconChevron />
        </button>

        <hr className="sidebar-divider" />

        <nav className="sidebar-nav" aria-label="Navegación">
          <NavLink
            to="/"
            end={false}
            title="Análisis exploratorio"
            className={({ isActive }) => {
              const active =
                isActive &&
                (workspaceStep === 'analyze' ||
                  workspaceStep === 'explore' ||
                  !searchParams.get('step'))
              return `sidebar-link${active ? ' sidebar-link--active' : ''}`
            }}
          >
            <span className="sidebar-link-icon">
              <IconInsights />
            </span>
            <span className="sidebar-link-label">Análisis exploratorio</span>
          </NavLink>
          <NavLink
            to="/historial"
            title="Historial"
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
            }
          >
            <span className="sidebar-link-icon">
              <IconHistory />
            </span>
            <span className="sidebar-link-label">Historial</span>
          </NavLink>
          <NavLink
            to="/?step=consolidate"
            title="Dashboard conversacional"
            className={({ isActive }) => {
              const active = isActive && workspaceStep === 'consolidate'
              return `sidebar-link${active ? ' sidebar-link--active' : ''}`
            }}
          >
            <span className="sidebar-link-icon">
              <IconDashboard />
            </span>
            <span className="sidebar-link-label">Dashboard conversacional</span>
          </NavLink>
          <NavLink
            to="/?step=report"
            title="Informes Metabase"
            className={({ isActive }) => {
              const active = isActive && workspaceStep === 'report'
              return `sidebar-link${active ? ' sidebar-link--active' : ''}`
            }}
          >
            <span className="sidebar-link-icon">
              <IconDashboard />
            </span>
            <span className="sidebar-link-label">
              Informes Metabase
              <span className="sidebar-link-sublabel">Paso 4</span>
            </span>
          </NavLink>
        </nav>

        <footer className="sidebar-footer">
          <button type="button" className="sidebar-logout" onClick={logout} title="Cerrar sesión">
            <IconLogout />
            <span className="sidebar-logout-label">Cerrar sesión</span>
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
