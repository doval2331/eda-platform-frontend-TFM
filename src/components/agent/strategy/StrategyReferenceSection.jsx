import PropTypes from 'prop-types'
import { Collapse } from '@mui/material'
import { useState } from 'react'
import { StrategyStepList } from './StrategyStepList'

export function StrategyReferenceSection({
  overview,
  steps = [],
  selectedStrategyVariables = {},
  llmActive = false,
  strategyConfirmed = false,
}) {
  const [open, setOpen] = useState(false)

  if (!overview || !steps.length) return null

  return (
    <div className="agent-panel-section agent-panel-section--strategy-reference">
      <button
        type="button"
        className="strategy-reference__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="strategy-reference__toggle-title">Estrategia aplicada</span>
        <span className="strategy-reference__toggle-meta">{overview.statsLine}</span>
        <span className="strategy-reference__toggle-action">{open ? 'Ocultar' : 'Ver detalle'}</span>
      </button>
      <Collapse in={open}>
        <div className="strategy-reference__body">
          <p className="strategy-reference__note">
            {strategyConfirmed
              ? 'Consulta de referencia. Confirmaste las variables en el paso Estrategia antes de interpretar.'
              : 'Consulta de referencia. Las variables mostradas son las que uso el agente para generar los hallazgos.'}
          </p>
          <StrategyStepList
            steps={steps}
            selectedStrategyVariables={selectedStrategyVariables}
            llmActive={llmActive}
          />
        </div>
      </Collapse>
    </div>
  )
}

StrategyReferenceSection.propTypes = {
  overview: PropTypes.object,
  steps: PropTypes.arrayOf(PropTypes.object),
  selectedStrategyVariables: PropTypes.object,
  llmActive: PropTypes.bool,
  strategyConfirmed: PropTypes.bool,
}
