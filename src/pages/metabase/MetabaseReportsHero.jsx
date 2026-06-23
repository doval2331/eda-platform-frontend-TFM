import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Button, Card, LoadingPanel, LoadingSlot } from '@/ui'

export function MetabaseReportsHero({
  phase,
  embedUrl,
  error,
  loading,
  onRetry,
}) {
  const showInitialLoading = loading && !embedUrl

  if (showInitialLoading) {
    return (
      <Card className="decision-empty decision-empty--loading metabase-reports-loading-card">
        <LoadingSlot variant="card">
          <LoadingPanel
            bare
            compact
            spinnerSize={64}
            title="Preparando tu informe…"
            description="Publicando hallazgos y cargando gráficos de SLA, riesgo y clusters."
          />
        </LoadingSlot>
      </Card>
    )
  }

  if (phase === 'empty') {
    return (
      <Card className="decision-empty metabase-reports-empty-card">
        <h2>Aún no hay datos para el informe</h2>
        <p>
          Selecciona hallazgos en el chat o en el análisis asistido y vuelve aquí. La plataforma
          publicará automáticamente tus insights al abrir esta vista.
        </p>
        <Link to="/" className="decision-link">
          Volver a explorar
        </Link>
      </Card>
    )
  }

  if (phase === 'error' && !embedUrl) {
    return (
      <Card className="decision-empty metabase-reports-empty-card">
        <h2>No pudimos actualizar el informe</h2>
        <p>{error || 'Inténtalo de nuevo en unos segundos.'}</p>
        <Button type="button" variant="primary" onClick={onRetry}>
          Reintentar
        </Button>
      </Card>
    )
  }

  return (
    <section className="metabase-reports-hero metabase-reports-hero--ready">
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
  loading: PropTypes.bool,
  onRetry: PropTypes.func.isRequired,
}
