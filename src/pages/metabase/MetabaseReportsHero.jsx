import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Button, Card, LoadingPanel, LoadingSlot } from '@/ui'

export function MetabaseReportsHero({
  phase,
  embedUrl,
  dashboardUrl,
  error,
  emptyDetail,
  loading,
  progress = 0,
  progressLabel = '',
  progressDetail = '',
  onRetry,
}) {
  const showInitialLoading = loading && !embedUrl
  const safeProgress = Math.min(100, Math.max(0, Math.round(Number(progress) || 0)))

  if (showInitialLoading) {
    return (
      <Card className="decision-empty decision-empty--loading metabase-reports-loading-card">
        <LoadingSlot variant="card">
          <div className="metabase-progress-panel" role="status" aria-live="polite">
            <LoadingPanel
              bare
              compact
              spinnerSize={64}
              title={progressLabel || 'Preparando tu informe...'}
              description={
                progressDetail || 'Publicando hallazgos y cargando graficos de SLA, riesgo y clusters.'
              }
            />
            <div className="metabase-progress-panel__summary">
              <span>{progressLabel || 'Preparando informe'}</span>
              <strong>{safeProgress}%</strong>
            </div>
            <div
              className="metabase-progress-panel__bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={safeProgress}
              aria-label="Progreso de generacion del informe"
            >
              <span style={{ width: `${safeProgress}%` }} />
            </div>
            <ol className="metabase-progress-steps" aria-label="Etapas del informe">
              {[
                ['Verificar BI', 12],
                ['Publicar datos', 42],
                ['Validar tablas', 72],
                ['Abrir informe', 94],
              ].map(([label, threshold]) => (
                <li
                  key={label}
                  className={
                    safeProgress >= threshold
                      ? 'metabase-progress-steps__item metabase-progress-steps__item--completed'
                      : 'metabase-progress-steps__item'
                  }
                >
                  {label}
                </li>
              ))}
            </ol>
          </div>
        </LoadingSlot>
      </Card>
    )
  }

  if (phase === 'empty') {
    return (
      <Card className="decision-empty metabase-reports-empty-card">
        <h2>Aun no hay datos para el informe</h2>
        <p>
          Selecciona hallazgos en el chat o en el analisis asistido y vuelve aqui. La plataforma
          publicara automaticamente tus insights al abrir esta vista.
        </p>
        {emptyDetail ? <p className="metabase-reports-empty-card__detail">{emptyDetail}</p> : null}
        <Button type="button" variant="secondary" onClick={onRetry}>
          Actualizar informe
        </Button>
        <Link to="/" className="decision-link">
          Volver a explorar
        </Link>
      </Card>
    )
  }

  if (phase === 'external') {
    return (
      <Card className="decision-empty metabase-reports-empty-card metabase-reports-external-card">
        <h2>Informe publicado en Metabase</h2>
        <p>
          Los datos BI fueron publicados, pero la incrustacion segura no esta configurada en este
          entorno.
        </p>
        <p className="metabase-reports-empty-card__detail">
          Puedes abrir el dashboard directamente en Metabase. Para verlo embebido en la plataforma,
          configura el secreto de embedding en el backend.
        </p>
        <div className="metabase-reports-external-actions">
          {dashboardUrl ? (
            <a
              className="decision-link metabase-reports-external-link"
              href={dashboardUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir Metabase
            </a>
          ) : null}
          <Button type="button" variant="secondary" onClick={onRetry}>
            Actualizar informe
          </Button>
        </div>
      </Card>
    )
  }
  if (phase === 'error' && !embedUrl) {
    return (
      <Card className="decision-empty metabase-reports-empty-card">
        <h2>No pudimos actualizar el informe</h2>
        <p>{error || 'Intentalo de nuevo en unos segundos.'}</p>
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
  phase: PropTypes.oneOf(['loading', 'ready', 'empty', 'error', 'external']).isRequired,
  embedUrl: PropTypes.string,
  dashboardUrl: PropTypes.string,
  error: PropTypes.string,
  emptyDetail: PropTypes.string,
  loading: PropTypes.bool,
  progress: PropTypes.number,
  progressLabel: PropTypes.string,
  progressDetail: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
}
