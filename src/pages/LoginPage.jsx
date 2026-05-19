import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiHttpError } from '../api/apiClient'
import { useAuth } from '../hooks/useAuth'
import { Button, Card, Feedback, Input } from '../ui'
import '../styles/login.css'

function errorMessage(error) {
  if (error instanceof ApiHttpError) return error.message
  if (error instanceof Error) return error.message
  return 'Error desconocido'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { loginWithCredentials, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('analista@tfm.local')
  const [password, setPassword] = useState('')
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
      navigate('/', { replace: true })
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <Card className="login-card">
        <div className="login-brand">
          <span className="login-brand-icon" aria-hidden>
            EDA
          </span>
          <div>
            <p className="eyebrow">TFM · Prototipo</p>
            <h1 className="login-title">Iniciar sesión</h1>
          </div>
        </div>

        <p className="muted login-subtitle">
          Accede al análisis exploratorio con reducción de dimensionalidad y clustering.
        </p>

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

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>

        <p className="note login-hint">
          Usuario demo: ejecuta <code>python scripts/seed_user.py</code> en el backend si aún no existe.
        </p>
      </Card>
    </div>
  )
}
