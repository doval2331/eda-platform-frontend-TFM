import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { ANALYSIS_FLOW_STEPS, flowStepIndex } from '@/utils/biFlow'

export function AnalysisFlowStrip({ currentStepId = 'analyze', compact = false }) {
  const currentIndex = flowStepIndex(currentStepId)

  return (
    <nav
      className={`analysis-flow-strip${compact ? ' analysis-flow-strip--compact' : ''}`}
      aria-label="Recorrido de análisis"
    >
      <p className="analysis-flow-strip__title">
        {compact ? 'Recorrido' : 'Cómo usar la plataforma'}
      </p>
      <ol className="analysis-flow-strip__steps">
        {ANALYSIS_FLOW_STEPS.map((step, index) => {
          const isCurrent = step.id === currentStepId
          const isDone = currentIndex > index
          const className = [
            'analysis-flow-step',
            isCurrent ? 'analysis-flow-step--current' : '',
            isDone ? 'analysis-flow-step--done' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <li key={step.id} className={className}>
              <Link to={step.path} className="analysis-flow-step__link">
                <span className="analysis-flow-step__index" aria-hidden>
                  {step.shortLabel}
                </span>
                <span className="analysis-flow-step__label">{step.label}</span>
                {!compact ? (
                  <span className="analysis-flow-step__hint">{step.description}</span>
                ) : null}
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

AnalysisFlowStrip.propTypes = {
  currentStepId: PropTypes.oneOf(['analyze', 'explore', 'consolidate', 'report']),
  compact: PropTypes.bool,
}
