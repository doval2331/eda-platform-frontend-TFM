import PropTypes from 'prop-types'

const PHASES = [
  { id: 'strategy', label: 'Estrategia' },
  { id: 'interpret', label: 'Interpretar' },
  { id: 'review', label: 'Hallazgos' },
]

function phaseIndex(phase) {
  return PHASES.findIndex((item) => item.id === phase)
}

export function AgentPhaseSteps({ phase }) {
  const current = phaseIndex(phase)

  return (
    <ol className="agent-phase-steps" aria-label="Progreso del analisis asistido">
      {PHASES.map((item, index) => {
        const done = index < current
        const active = index === current
        return (
          <li
            key={item.id}
            className={`agent-phase-steps__item${done ? ' agent-phase-steps__item--done' : ''}${
              active ? ' agent-phase-steps__item--active' : ''
            }`}
          >
            <span className="agent-phase-steps__marker" aria-hidden>
              {done ? '✓' : index + 1}
            </span>
            <span className="agent-phase-steps__label">{item.label}</span>
          </li>
        )
      })}
    </ol>
  )
}

AgentPhaseSteps.propTypes = {
  phase: PropTypes.oneOf(['strategy', 'interpret', 'review']).isRequired,
}

export function resolveAgentPhase({ recommendations, insights, strategyConfirmed }) {
  if (insights.length > 0) return 'review'
  if (recommendations.length > 0 && strategyConfirmed) return 'interpret'
  if (recommendations.length > 0) return 'strategy'
  return 'strategy'
}
