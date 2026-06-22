import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Button, LoadingPanel } from '@/ui'

function formatUpdatedAt(value) {
  if (!value) return null
  try {
    return value.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return null
  }
}

export function MetabaseReportsHero({
  phase,
  embedUrl,
  error,
  lastUpdatedAt,
  refreshing,
  onRetry,
}) {
  const updatedLabel = formatUpdatedAt(lastUpdatedAt)

  if (phase === 'loading' || refreshing) {
    return (
      <section className="metabase-reports-hero metabase-reports-hero--loading" aria-live="polite">
        <LoadingPanel
          embedded
          title={refreshing ? 'Actualizando informe…' : 'Preparando tu informe…'}
          description="Publicando hallazgos y cargando gráficos de SLA, riesgo y clusters."
        />
      </section>
    )
  }

  if (phase === 'empty') {
    return (
      <section className="metabase-reports-hero metabase-reports-hero--empty">
        <div className="metabase-reports-empty">
          <h2>Aún no hay datos para el informe</h2>
          <p>
            Selecciona hallazgos en el chat o en el análisis asistido y vuelve aquí. La plataforma
            publicará automáticamente tus insights al abrir esta vista.
          </p>
          <Link to="/" className="decision-link">
            Volver a explorar
          </Link>
        </div>
      </section>
    )
  }

  if (phase === 'error') {
    return (
      <section className="metabase-reports-hero metabase-reports-hero--error">
        <div className="metabase-reports-empty">
          <h2>No pudimos actualizar el informe</h2>
          <p>{error || 'Inténtalo de nuevo en unos segundos.'}</p>
          <Button type="button" variant="primary" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="metabase-reports-hero metabase-reports-hero--ready">
      {updatedLabel ? (
        <p className="metabase-reports-status" role="status">
          Datos listos · actualizado a las {updatedLabel}
        </p>
      ) : null}
      {embedUrl ? (
        <iframe
          title="Informe de incidencias"
          src={embedUrl}
          className="metabase-reports-frame"
          allowTransparency
        />
      ) : null}
    </section>
  )
}

MetabaseReportsHero.propTypes = {
  phase: PropTypes.oneOf(['loading', 'ready', 'empty', 'error']).isRequired,
  embedUrl: PropTypes.string,
  error: PropTypes.string,
  lastUpdatedAt: PropTypes.instanceOf(Date),
  refreshing: PropTypes.bool,
  onRetry: PropTypes.func.isRequired,
}
