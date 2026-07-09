import PropTypes from 'prop-types'
import { Card } from '@/ui'

function evaluationItemsForMode(items = [], isExpertMode = false) {
  const sourceItems = Array.isArray(items) ? items : []
  if (isExpertMode) return sourceItems

  const translated = []
  const seen = new Set()

  sourceItems.forEach((item) => {
    const label = String(item?.label || '').trim()
    if (!label) return
    const normalized = label.toLowerCase()
    let next = null

    if (normalized.includes('sugerido')) {
      next = { label: 'Sugerido por agente', tone: 'ok' }
    } else if (
      normalized.includes('grafico construible') ||
      normalized.includes('graficable')
    ) {
      next = { label: 'Graficable', tone: 'ok' }
    } else if (
      normalized.includes('valida con datos') ||
      normalized.includes('datos reales') ||
      normalized.includes('usa variables disponibles')
    ) {
      next = { label: 'Validado con datos', tone: 'ok' }
    } else if (normalized.includes('pregunta clara')) {
      next = { label: 'Responde una pregunta clara', tone: 'ok' }
    } else if (normalized.includes('datos suficientes')) {
      next = { label: 'Datos suficientes', tone: 'ok' }
    } else if (
      normalized.includes('invencion') ||
      normalized.includes('variable sugerida no existe') ||
      normalized.includes('variable tecnica') ||
      normalized.includes('traduccion funcional') ||
      normalized.includes('requiere revision') ||
      normalized.includes('ajustado')
    ) {
      next = { label: 'Requiere revision', tone: 'warning' }
    } else if (normalized.includes('requiere datos')) {
      next = { label: 'Requiere datos', tone: 'warning' }
    } else if (normalized.includes('no graficable')) {
      next = { label: 'No graficable aun', tone: 'warning' }
    }

    if (!next || seen.has(next.label)) return
    seen.add(next.label)
    translated.push(next)
  })

  return translated.slice(0, 5)
}

function feedbackStatusForMode(status = '', isExpertMode = false) {
  if (!status || isExpertMode) return status
  const normalized = status.toLowerCase()
  if (normalized.includes('no util') || normalized.includes('no útil') || normalized.includes('ajustar')) {
    return 'Gracias: la revisaremos antes de volver a sugerirla.'
  }
  return normalized.includes('util')
    ? 'Gracias: priorizaremos esta recomendacion.'
    : 'Gracias: la revisaremos.'
}

export function ConversationAgentGuide({
  items = [],
  hiddenCount = 0,
  isExpertMode = false,
  onApply,
  onGraph,
  onChat,
  onAdd,
  onFeedback,
}) {
  return (
    <section className="dashboard-spec-section dashboard-spec-guide-section">
      <div className="dashboard-spec-section-head">
        <div>
          <span className="dashboard-spec-eyebrow">
            {isExpertMode ? 'Guia del agente' : 'Ruta recomendada'}
          </span>
          <h2>{isExpertMode ? 'Que recomienda revisar el agente' : 'Que conviene revisar primero'}</h2>
          <p>
            {isExpertMode
              ? 'Usa esta lista como ruta de analisis. Algunas acciones abren un grafico y otras preparan una respuesta del agente con contexto.'
              : 'La lista prioriza acciones con casos disponibles, evidencia y una siguiente accion clara.'}
          </p>
        </div>
      </div>
      <div className="dashboard-spec-list">
        {items.length ? (
          items.map((item) => {
            const visibleEvaluations = evaluationItemsForMode(
              item.evaluationItems,
              isExpertMode,
            )
            const feedbackStatus = feedbackStatusForMode(item.feedbackStatus, isExpertMode)

            return (
              <Card
                key={item.id}
                className={`dashboard-spec-list-item${
                  item.isActive ? ' dashboard-spec-list-item--active' : ''
                }`}
              >
                <span className="dashboard-spec-list-number">{item.number}</span>
                <div className="dashboard-spec-list-copy">
                  <div className="dashboard-spec-chip-row">
                    <span>{item.audienceLabel}</span>
                    <span>{item.actionLabel}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <small>{item.nextStep}</small>
                  <small className="dashboard-spec-linked-viz">{item.hint}</small>
                  {visibleEvaluations.length ? (
                    <div className="dashboard-spec-eval-row">
                      {visibleEvaluations.map((evaluation) => (
                        <span
                          key={`${item.id}-${evaluation.label}`}
                          className={`dashboard-spec-eval-chip dashboard-spec-eval-chip--${evaluation.tone}`}
                        >
                          {evaluation.label}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="dashboard-spec-list-actions">
                  {isExpertMode ? (
                    <button type="button" onClick={() => onApply(item)}>
                      {item.applyLabel}
                    </button>
                  ) : null}
                  {item.graphReady ? (
                    <button type="button" onClick={() => onGraph(item)}>
                      Ver grafico
                    </button>
                  ) : null}
                  <button type="button" onClick={() => onChat(item)}>
                    {item.chatLabel}
                  </button>
                  {isExpertMode ? (
                    <button type="button" onClick={() => onAdd(item)}>
                      Agregar
                    </button>
                  ) : null}
                  <div className="dashboard-spec-feedback-actions">
                    <button
                      type="button"
                      className={item.feedbackValue === 'useful' ? 'is-selected' : ''}
                      aria-pressed={item.feedbackValue === 'useful'}
                      onClick={() => onFeedback(item, true)}
                    >
                      Util
                    </button>
                    <button
                      type="button"
                      className={item.feedbackValue === 'not_useful' ? 'is-selected' : ''}
                      aria-pressed={item.feedbackValue === 'not_useful'}
                      onClick={() => onFeedback(item, false)}
                    >
                      No util
                    </button>
                  </div>
                  {feedbackStatus ? (
                    <small className="dashboard-spec-feedback-status">{feedbackStatus}</small>
                  ) : null}
                </div>
              </Card>
            )
          })
        ) : (
          <Card className="dashboard-spec-empty-card">No hay recomendaciones para este modo.</Card>
        )}
      </div>
      {!isExpertMode && hiddenCount > 0 ? (
        <div className="dashboard-spec-compact-note">
          Mostrando {items.length} recomendaciones principales. Hay {hiddenCount} recomendaciones
          adicionales disponibles en modo experto o desde Ver detalle.
        </div>
      ) : null}
    </section>
  )
}

ConversationAgentGuide.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      number: PropTypes.string.isRequired,
      isActive: PropTypes.bool,
      audienceLabel: PropTypes.string.isRequired,
      actionLabel: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      body: PropTypes.string,
      nextStep: PropTypes.string,
      hint: PropTypes.string,
      evaluationItems: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          tone: PropTypes.string.isRequired,
        }),
      ),
      graphReady: PropTypes.bool,
      applyLabel: PropTypes.string,
      chatLabel: PropTypes.string,
      feedbackValue: PropTypes.string,
      feedbackStatus: PropTypes.string,
      recommendation: PropTypes.object,
      visualization: PropTypes.object,
    }),
  ),
  hiddenCount: PropTypes.number,
  isExpertMode: PropTypes.bool,
  onApply: PropTypes.func.isRequired,
  onGraph: PropTypes.func.isRequired,
  onChat: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired,
  onFeedback: PropTypes.func.isRequired,
}
