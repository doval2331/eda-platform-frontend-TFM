import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiHttpError } from '@/api/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { Button, Feedback, Input } from '@/ui'
import '@/styles/login.css'

const REMEMBER_KEY = 'eda_login_remember'
const EMAIL_KEY = 'eda_login_email'

function readRememberedEmail() {
  try {
    if (localStorage.getItem(REMEMBER_KEY) !== '1') return ''
    return localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

function persistRememberedEmail(email, remember) {
  try {
    if (remember) {
      localStorage.setItem(REMEMBER_KEY, '1')
      localStorage.setItem(EMAIL_KEY, email)
    } else {
      localStorage.removeItem(REMEMBER_KEY)
      localStorage.removeItem(EMAIL_KEY)
    }
  } catch {
    // El inicio de sesión continúa aunque el navegador bloquee el almacenamiento local.
  }
}

function errorMessage(error) {
  if (error instanceof ApiHttpError) return error.message
  if (error instanceof Error) return error.message
  return 'Error desconocido'
}

const HERO_CHIPS = ['Clusters', 'Incidencias IT', 'Análisis']

export function LoginPage() {
  const navigate = useNavigate()
  const { loginWithCredentials, isAuthenticated } = useAuth()
  const [email, setEmail] = useState(() => readRememberedEmail() || 'analista@tfm.local')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => localStorage.getItem(REMEMBER_KEY) === '1')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const onSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    setLoading(true)
    try {
      await loginWithCredentials(email, password)
      persistRememberedEmail(email.trim(), remember)
      navigate('/', { replace: true })
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero" aria-label="Presentación de la plataforma">
        <div className="login-hero__inner">
          <div className="login-hero__brand">
            <span className="login-brand-icon" aria-hidden>
              EDA
            </span>
            <span className="login-hero__badge">TFM · Prototipo académico</span>
          </div>

          <div className="login-hero__copy">
            <h1 className="login-hero__title">Plataforma de análisis de incidencias IT</h1>
            <p className="login-hero__subtitle">
              Agrupa tickets, detecta patrones y explora tus datos con agentes asistidos.
            </p>
          </div>

          <ul className="login-hero__chips">
            {HERO_CHIPS.map((label) => (
              <li key={label} className="login-hero__chip">
                {label}
              </li>
            ))}
          </ul>
        </div>

        <svg
          className="login-hero__viz"
          viewBox="0 0 520 320"
          aria-hidden
          focusable="false"
        >
          <defs>
            <linearGradient id="login-viz-line" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7551ff" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <circle cx="88" cy="72" r="52" fill="rgba(117, 81, 255, 0.08)" />
          <circle cx="420" cy="240" r="68" fill="rgba(6, 182, 212, 0.07)" />
          <path
            d="M40 260 C 120 180, 180 120, 260 150 S 400 80, 480 120"
            fill="none"
            stroke="url(#login-viz-line)"
            strokeWidth="1.5"
          />
          {[
            [72, 210, '#7551ff'],
            [130, 168, '#6366f1'],
            [188, 142, '#06b6d4'],
            [248, 156, '#7551ff'],
            [310, 118, '#4318ff'],
            [372, 148, '#06b6d4'],
            [430, 108, '#7551ff'],
            [156, 228, '#a78bfa'],
            [340, 208, '#6366f1'],
          ].map(([cx, cy, fill], index) => (
            <circle key={index} cx={cx} cy={cy} r={index % 3 === 0 ? 7 : 5} fill={fill} opacity="0.85" />
          ))}
        </svg>
      </aside>

      <main className="login-panel">
        <div className="login-card">
          <header className="login-card__head">
            <p className="login-card__eyebrow">Bienvenido</p>
            <h2 className="login-card__title">Iniciar sesión</h2>
          </header>

          <form className="login-form" onSubmit={onSubmit} noValidate>
            {message ? <Feedback variant="danger" message={message} /> : null}

            <Input
              label="Correo"
              id="login-email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="analista@tfm.local"
            />

            <Input
              label="Contraseña"
              id="login-password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
            />

            <label className="login-remember">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={loading}
              />
              <span>Recordarme en este equipo</span>
            </label>

            <Button type="submit" variant="primary" className="login-submit" disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>

         
        </div>
      </main>
    </div>
  )
}
