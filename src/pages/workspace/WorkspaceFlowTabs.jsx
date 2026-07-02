import PropTypes from 'prop-types'
import CheckIcon from '@mui/icons-material/Check'
import { ANALYSIS_FLOW_STEPS, flowStepIndex } from '@/utils/biFlow'

export function WorkspaceFlowTabs({
  activeTab,
  onChange,
  hasRunResults = false,
  className = '',
}) {
  const currentIndex = flowStepIndex(activeTab)

  return (
    <nav
      className={`workspace-flow-tabs${className ? ` ${className}` : ''}`}
      aria-label="Recorrido de análisis"
    >
      <p className="workspace-flow-tabs__title">Recorrido</p>
      <ol className="workspace-flow-tabs__list">
        {ANALYSIS_FLOW_STEPS.map((step, index) => {
          const isActive = step.id === activeTab
          const isDone =
            step.id === 'analyze'
              ? hasRunResults && currentIndex >= 1
              : step.id === 'explore'
                ? hasRunResults && currentIndex > 1
                : currentIndex > index
          const className = [
            'workspace-flow-tab',
            isActive ? 'workspace-flow-tab--active' : '',
            isDone ? 'workspace-flow-tab--done' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <li key={step.id} className={className}>
              <button
                type="button"
                className="workspace-flow-tab__btn"
                onClick={() => onChange(step.id)}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="workspace-flow-tab__index" aria-hidden>
                  {isDone ? <CheckIcon sx={{ fontSize: 14 }} /> : step.shortLabel}
                </span>
                <span className="workspace-flow-tab__label">{step.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

WorkspaceFlowTabs.propTypes = {
  activeTab: PropTypes.oneOf(['analyze', 'explore', 'consolidate', 'report']).isRequired,
  onChange: PropTypes.func.isRequired,
  hasRunResults: PropTypes.bool,
  className: PropTypes.string,
}
