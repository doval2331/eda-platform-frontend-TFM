import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import {
  buildStrategyStepModel,
  parseVariables,
  strategyItemKey,
} from '@/utils/strategyPresentation'
import { StrategyPhaseFooter } from './StrategyPhaseFooter'
import { StrategyStepRow } from './StrategyStepRow'

export function StrategyStepList({
  steps = [],
  selectedStrategyVariables = {},
  onToggleVariable,
  llmActive = false,
  phaseFooter = null,
  onConfirm,
  onInterpret,
  confirmLoading = false,
  interpretLoading = false,
  actionDisabled = false,
  className = '',
}) {
  const models = useMemo(
    () =>
      (steps ?? []).map((item) => {
        const key = strategyItemKey(item)
        const selected = selectedStrategyVariables[key] ?? parseVariables(item.variables_used)
        return buildStrategyStepModel(item, selected)
      }),
    [steps, selectedStrategyVariables],
  )

  const [expandedId, setExpandedId] = useState(() => models[0]?.id ?? null)

  if (!models.length) return null

  return (
    <div className={`strategy-step-list-wrap ${className}`.trim()}>
      <div className="strategy-step-list" role="list" aria-label="Pasos de estrategia">
        {models.map((step, index) => (
          <StrategyStepRow
            key={step.id}
            step={step}
            index={index + 1}
            expanded={expandedId === step.id}
            onToggle={() => setExpandedId((current) => (current === step.id ? null : step.id))}
            onToggleVariable={
              onToggleVariable
                ? (variableName) => onToggleVariable(steps[index], variableName)
                : undefined
            }
            llmActive={llmActive}
          />
        ))}
      </div>

      <StrategyPhaseFooter
        phase={phaseFooter}
        onConfirm={onConfirm}
        onInterpret={onInterpret}
        confirmLoading={confirmLoading}
        interpretLoading={interpretLoading}
        disabled={actionDisabled}
      />
    </div>
  )
}

StrategyStepList.propTypes = {
  steps: PropTypes.arrayOf(PropTypes.object),
  selectedStrategyVariables: PropTypes.object,
  onToggleVariable: PropTypes.func,
  llmActive: PropTypes.bool,
  phaseFooter: PropTypes.oneOf(['strategy', 'interpret']),
  onConfirm: PropTypes.func,
  onInterpret: PropTypes.func,
  confirmLoading: PropTypes.bool,
  interpretLoading: PropTypes.bool,
  actionDisabled: PropTypes.bool,
  className: PropTypes.string,
}
