import PropTypes from 'prop-types'
import { businessVariableLabel } from '@/utils/strategyPresentation'

export function StrategyVariableChips({
  variables,
  max = 5,
  selectedVariables = null,
  onToggleVariable = null,
  showAll = false,
  onShowAll = null,
}) {
  const labels = variables.map((name) => ({
    raw: name,
    label: businessVariableLabel(name),
  }))
  const visible = showAll ? labels : labels.slice(0, max)
  const rest = labels.length - (showAll ? labels.length : Math.min(max, labels.length))

  if (!labels.length) return null

  const selectable = typeof onToggleVariable === 'function'
  const selectedSet = new Set(selectedVariables ?? variables)

  return (
    <div className="strategy-var-chips agent-var-chips" aria-label="Variables sugeridas">
      {visible.map(({ raw, label }) =>
        selectable ? (
          <button
            className={`agent-var-chip agent-var-chip--button strategy-var-chip${
              selectedSet.has(raw) ? ' agent-var-chip--selected' : ''
            }`}
            key={raw}
            type="button"
            aria-pressed={selectedSet.has(raw)}
            onClick={() => onToggleVariable(raw)}
          >
            {selectedSet.has(raw) ? '✓ ' : ''}
            {label}
          </button>
        ) : (
          <span className="agent-var-chip strategy-var-chip" key={raw}>
            {label}
          </span>
        ),
      )}
      {!showAll && rest > 0 ? (
        onShowAll ? (
          <button type="button" className="strategy-var-chip strategy-var-chip--more" onClick={onShowAll}>
            +{rest} mas
          </button>
        ) : (
          <span className="agent-var-chip agent-var-chip--more">+{rest}</span>
        )
      ) : null}
      {showAll && onShowAll ? (
        <button type="button" className="strategy-var-chip strategy-var-chip--more" onClick={onShowAll}>
          Ver menos
        </button>
      ) : null}
    </div>
  )
}

StrategyVariableChips.propTypes = {
  variables: PropTypes.arrayOf(PropTypes.string).isRequired,
  max: PropTypes.number,
  selectedVariables: PropTypes.arrayOf(PropTypes.string),
  onToggleVariable: PropTypes.func,
  showAll: PropTypes.bool,
  onShowAll: PropTypes.func,
}
