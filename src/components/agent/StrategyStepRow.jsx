import PropTypes from 'prop-types'
import { Collapse } from '@mui/material'
import { useState } from 'react'
import { PriorityChip } from './PriorityChip'
import { StrategyVariableChips } from './StrategyVariableChips'

export function StrategyStepRow({
  step,
  index,
  expanded,
  onToggle,
  onToggleVariable,
  llmActive = false,
}) {
  const [showAllVars, setShowAllVars] = useState(false)

  if (!step) return null

  const varLabel =
    step.totalCount > 0
      ? `${step.selectedCount}/${step.totalCount}`
      : '0'

  const previewLabel =
    step.totalCount > 0
      ? `${step.selectedCount} de ${step.totalCount} variables seleccionadas`
      : 'Sin variables'

  return (
    <article
      className={`agent-step-row strategy-step-row${expanded ? ' strategy-step-row--expanded agent-step-row--expanded' : ''}${
        llmActive ? ' agent-step-row--llm strategy-step-row--llm' : ''
      }`}
    >
      <button
        type="button"
        className="agent-step-row__head strategy-step-row__head"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="agent-step-row__index strategy-step-row__index">{index}</span>
        <span className="agent-step-row__content strategy-step-row__content">
          <span className="agent-step-row__title strategy-step-row__title">{step.title}</span>
          {expanded ? null : (
            <span className="strategy-step-row__preview">{previewLabel}</span>
          )}
        </span>
        <span className="agent-step-row__meta strategy-step-row__meta">
          <span
            className="agent-step-row__vars strategy-step-row__vars"
            title={`${step.selectedCount} de ${step.totalCount} variables`}
          >
            {varLabel}
          </span>
          <PriorityChip level={step.priority} />
          <span className="agent-step-row__chevron strategy-step-row__chevron" aria-hidden>
            {expanded ? '▾' : '▸'}
          </span>
        </span>
      </button>

      <Collapse in={expanded}>
        <div className="agent-step-row__body strategy-step-row__body">
          <StrategyVariableChips
            variables={step.variables}
            max={5}
            selectedVariables={step.selectedVariables}
            onToggleVariable={onToggleVariable}
            showAll={showAllVars}
            onShowAll={() => setShowAllVars((value) => !value)}
          />
          {(step.summaryOriginal || step.recommendationOriginal || step.justificationOriginal) && (
            <details className="agent-compact-details agent-step-row__details">
              <summary>Detalle tecnico</summary>
              {step.summaryOriginal ? (
                <p>
                  <strong>Resumen:</strong> {step.summaryOriginal}
                </p>
              ) : null}
              {step.recommendationOriginal ? (
                <p>
                  <strong>Recomendacion:</strong> {step.recommendationOriginal}
                </p>
              ) : null}
              {step.justificationOriginal ? <p>{step.justificationOriginal}</p> : null}
            </details>
          )}
        </div>
      </Collapse>
    </article>
  )
}

StrategyStepRow.propTypes = {
  step: PropTypes.object,
  index: PropTypes.number.isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onToggleVariable: PropTypes.func,
  llmActive: PropTypes.bool,
}
