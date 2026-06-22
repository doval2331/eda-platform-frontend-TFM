import PropTypes from 'prop-types'
import { PriorityChip } from '../shared/PriorityChip'

export function InsightStepRow({
  step,
  selected,
  onOpen,
  onToggleSelect,
}) {
  if (!step) return null

  return (
    <article
      className={`agent-step-row insight-step-row${selected ? ' insight-step-row--selected' : ''}${
        step.llmEnriched ? ' agent-step-row--llm' : ''
      }`}
    >
      <div className="insight-step-row__head">
        <label className="insight-step-row__check" onClick={(event) => event.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(step.raw)}
            aria-label={`Seleccionar ${step.title}`}
          />
        </label>
        <button
          type="button"
          className="insight-step-row__toggle"
          aria-haspopup="dialog"
          onClick={() => onOpen?.(step)}
        >
          <span className="insight-step-row__primary">
            <span className="insight-step-row__title">{step.title}</span>
          </span>
          <span className="insight-step-row__secondary">
            <PriorityChip level={step.risk} />
            <span className="insight-step-row__tickets">{step.ticketLabel}</span>
            <span className="agent-step-row__chevron" aria-hidden>
              ▸
            </span>
          </span>
        </button>
      </div>
    </article>
  )
}

InsightStepRow.propTypes = {
  step: PropTypes.object,
  selected: PropTypes.bool,
  onOpen: PropTypes.func.isRequired,
  onToggleSelect: PropTypes.func,
}
