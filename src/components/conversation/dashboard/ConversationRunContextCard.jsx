import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Card } from '@/ui'
import { runDisplayName } from '@/utils/conversationDashboard'

export function ConversationRunContextCard({ run, className = '' }) {
  if (!run?.id) return null

  const nClusters = run.metrics?.n_clusters ?? null
  const nSamples = run.n_samples ?? null
  const outliers = run.outliers_count ?? null

  return (
    <Card className={`conv-run-context-card ${className}`.trim()}>
      <div className="conv-run-context-card__main">
        <p className="conv-run-context-card__text">
          Contexto de la ejecución
          {runDisplayName(run) ? ` · ${runDisplayName(run)}` : ''}. Los KPIs y el scatter técnico
          completos están en el historial; aquí se consolida la base de evidencia guardada.
        </p>
        <div className="conv-run-context-card__stats">
          {nSamples != null ? (
            <div className="conv-run-context-card__stat">
              <span>Incidencias</span>
              <strong>{nSamples.toLocaleString('es-ES')}</strong>
            </div>
          ) : null}
          {nClusters != null ? (
            <div className="conv-run-context-card__stat">
              <span>Clusters</span>
              <strong>{nClusters.toLocaleString('es-ES')}</strong>
            </div>
          ) : null}
          {outliers != null ? (
            <div className="conv-run-context-card__stat">
              <span>Atípicos</span>
              <strong>{outliers.toLocaleString('es-ES')}</strong>
            </div>
          ) : null}
        </div>
      </div>
      <Link to={`/historial/${run.id}`} className="conv-run-context-card__link">
        Ver análisis técnico →
      </Link>
    </Card>
  )
}

ConversationRunContextCard.propTypes = {
  run: PropTypes.shape({
    id: PropTypes.string,
    n_samples: PropTypes.number,
    outliers_count: PropTypes.number,
    metrics: PropTypes.shape({
      n_clusters: PropTypes.number,
    }),
    project_name: PropTypes.string,
    source_name: PropTypes.string,
    modality: PropTypes.string,
  }),
  className: PropTypes.string,
}
