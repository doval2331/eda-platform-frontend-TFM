import PropTypes from 'prop-types'
import { LoadingPanel } from '@/ui'
import { formatSpanishNumber } from '@/utils/analysisStatus'

function workloadText(progress) {
  const parts = []
  if (progress?.sourceCount) {
    parts.push(`${progress.sourceCount} fuente${progress.sourceCount === 1 ? '' : 's'}`)
  }
  if (progress?.rowCount) {
    parts.push(`${formatSpanishNumber(progress.rowCount)} filas`)
  }
  return parts.join(' - ')
}

export function AnalysisProgressPanel({ progress, statusMessage }) {
  const percent = progress?.percent ?? 8
  const workload = workloadText(progress)

  return (
    <div className="analysis-progress-panel">
      <LoadingPanel
        bare
        compact
        spinnerSize={56}
        title="Analizando incidencias..."
        description={
          progress ? `${progress.label}. ${progress.detail}` : statusMessage
        }
      />

      <div className="analysis-progress-panel__summary">
        <span>
          Progreso estimado
          {workload ? ` - ${workload}` : ''}
        </span>
        <strong>{percent}%</strong>
      </div>

      <div
        className="analysis-progress-panel__bar"
        role="progressbar"
        aria-label="Progreso estimado del analisis"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      {progress?.stages?.length ? (
        <ol className="analysis-progress-steps" aria-label="Fases del analisis">
          {progress.stages.map((stage) => (
            <li
              key={stage.id}
              className={`analysis-progress-steps__item analysis-progress-steps__item--${stage.status}`}
            >
              {stage.label}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

AnalysisProgressPanel.propTypes = {
  progress: PropTypes.shape({
    percent: PropTypes.number,
    label: PropTypes.string,
    detail: PropTypes.string,
    sourceCount: PropTypes.number,
    rowCount: PropTypes.number,
    stages: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        status: PropTypes.oneOf(['completed', 'current', 'pending']).isRequired,
      }),
    ),
  }),
  statusMessage: PropTypes.string,
}
