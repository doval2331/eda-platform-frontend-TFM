import PropTypes from 'prop-types'
import { Collapse } from '@mui/material'
import { useState } from 'react'
import { LlmModeChip, SparkleIcon } from '@/components/LlmVisual'

export function StrategyActionCard({
  overview,
  llmActive = false,
  guideSteps = [],
  variant = 'active',
  className = '',
}) {
  const [guideOpen, setGuideOpen] = useState(false)

  if (!overview) return null

  const isReference = variant === 'reference'
  const title = isReference ? 'Estrategia aplicada' : 'Estrategia sugerida'

  return (
    <article
      className={`strategy-action-card${isReference ? ' strategy-action-card--reference' : ' strategy-action-card--hero'} ${className}`.trim()}
    >
      {!isReference ? <div className="strategy-action-card__accent" aria-hidden /> : null}

      <div className="strategy-action-card__shell">
        <header className="strategy-action-card__top">
          <div className="strategy-action-card__intro">
            {!isReference ? (
              <span className="strategy-action-card__kicker">Paso 1 · Configuracion</span>
            ) : null}
            <h4 className="strategy-action-card__title">{title}</h4>
            <div className="strategy-action-card__metrics" aria-label="Resumen de estrategia">
              <span className="strategy-action-card__metric">
                <strong>{overview.stepCount}</strong> pasos
              </span>
              <span className="strategy-action-card__metric">
                <strong>{overview.variableCount}</strong> variables
              </span>
              <span className="strategy-action-card__metric strategy-action-card__metric--high">
                <strong>{overview.highPriorityCount}</strong> alta prioridad
              </span>
            </div>
          </div>
          {llmActive ? <LlmModeChip mode="llm_active" /> : null}
        </header>

        {!isReference ? (
          <div className="strategy-action-card__lead">
            <span className="strategy-action-card__lead-icon" aria-hidden>
              <SparkleIcon size={16} />
            </span>
            <p>
              Revisa cada paso, ajusta las variables activas y confirma al final de la lista para
              continuar.
            </p>
          </div>
        ) : (
          <p className="strategy-action-card__reference-note">
            Variables y criterios usados para generar los hallazgos de esta ejecucion.
          </p>
        )}

        {guideSteps.length && !isReference ? (
          <div className="strategy-action-card__guide">
            <button
              type="button"
              className="strategy-action-card__guide-btn"
              aria-expanded={guideOpen}
              onClick={() => setGuideOpen((value) => !value)}
            >
              {guideOpen ? 'Ocultar guia' : 'Como funciona?'}
            </button>
            <Collapse in={guideOpen}>
              <ol className="strategy-action-card__guide-list">
                {guideSteps.map((step, index) => (
                  <li key={step.title}>
                    <span className="strategy-action-card__guide-step">{index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <span>{step.text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </Collapse>
          </div>
        ) : null}
      </div>
    </article>
  )
}

StrategyActionCard.propTypes = {
  overview: PropTypes.object,
  llmActive: PropTypes.bool,
  variant: PropTypes.oneOf(['active', 'reference']),
  guideSteps: PropTypes.arrayOf(
    PropTypes.shape({
      title: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
    }),
  ),
  className: PropTypes.string,
}
